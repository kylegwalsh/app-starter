import { stripe } from '@better-auth/stripe';
import { Organization } from '@prisma/client';
import { config, env } from '@repo/config';
import { plans } from '@repo/constants';
import { email } from '@repo/email';
import { betterAuth, BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, apiKey, organization } from 'better-auth/plugins';

import { db } from '@/db';

import { stripe as stripeClient } from './stripe';

// ---------- HELPERS ----------
/**
 * Whether the system should support personal organizations.
 * A valid use case for not supporting them is if you want to manually create organizations and invite users.
 */
const SUPPORT_PERSONAL_ORGANIZATIONS = true;

/** Get or create a personal organization for a user */
const getOrCreatePersonalOrganization = async ({ userId }: { userId: string }) => {
  // First, try to find existing personal organization for this user
  const existingPersonalOrg = await db.organization.findFirst({
    where: {
      isPersonal: true,
      members: {
        some: {
          userId: userId,
          role: 'owner',
        },
      },
    },
  });
  if (existingPersonalOrg) return existingPersonalOrg;

  // If we haven't created one, create a new personal organization
  const personalOrg = await db.organization.create({
    data: {
      name: `Personal account`,
      isPersonal: true,
      members: {
        create: {
          userId: userId,
          role: 'owner',
        },
      },
    },
  });

  return personalOrg;
};

/** Get the active organization for a user, attempt to use the  */
const getActiveOrganization = async ({
  userId,
  defaultOrganizationId,
}: {
  userId: string;
  defaultOrganizationId?: string | null;
}) => {
  let activeOrganization: Organization | null = null;

  // If they already have a default organization, use it
  if (defaultOrganizationId) {
    activeOrganization = await db.organization.findFirst({
      where: {
        id: defaultOrganizationId,
        members: {
          some: {
            userId: userId,
          },
        },
      },
    });
  }

  // If we didn't locate their default organization, we'll try to find a new one
  if (!activeOrganization) {
    activeOrganization = SUPPORT_PERSONAL_ORGANIZATIONS
      ? // If we allow personal organizations and the default organization doesn't
        // exist for some reason (it may have been deleted), then we'll create one
        await getOrCreatePersonalOrganization({ userId })
      : // If we don't allow personal organizations, we'll try finding any organization the user belongs to
        await db.organization.findFirst({
          where: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        });

    // If we found a replacement, we'll update the user's default organization
    if (activeOrganization) {
      await db.user.update({
        where: { id: userId },
        data: { defaultOrganizationId: activeOrganization.id },
      });
    }
  }
  // If we STILL don't have an active organization, then we'll err
  if (!activeOrganization) throw new Error('No organizations found for user');

  return activeOrganization;
};

// ---------- CONFIG ----------
/** The config for our Better Auth instance (defined separately to avoid TypeScript issues) */
const authConfig = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: config.api.url,
  appName: config.app.name,
  trustedOrigins: [config.app.url as string],
  // Connect to our prisma database
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  // Add some additional fields to our user
  user: {
    additionalFields: {
      defaultOrganizationId: {
        type: 'string',
        required: false,
      },
    },
  },
  // Create database hooks to enforce user's always have an active organization (simplifies db usage)
  databaseHooks: {
    user: {
      // Ensure all new user's get a personal organization by default
      create: {
        after: async (user) => {
          if (SUPPORT_PERSONAL_ORGANIZATIONS) {
            await getOrCreatePersonalOrganization({ userId: user.id });
          }
        },
      },
    },
    session: {
      // When creating a session, make sure that the user has an active organization set
      create: {
        before: async (session) => {
          if (session.userId) {
            // Get the user's default organization details
            const user = await db.user.findUnique({
              where: { id: session.userId },
              select: { defaultOrganizationId: true },
            });

            // Validate the default organization and grab a different one if it doesn't exist
            const activeOrganization = await getActiveOrganization({
              userId: session.userId,
              defaultOrganizationId: user?.defaultOrganizationId,
            });

            return {
              data: {
                ...session,
                // Add the active organization to the session
                activeOrganizationId: activeOrganization.id,
              },
            };
          }
        },
      },
      // When the user updates their session, ensure we update their default organization
      update: {
        after: async (session) => {
          if (session.userId) {
            // Retrieve the session details
            const currentSession = await db.session.findUnique({
              where: { id: session.id },
              select: { activeOrganizationId: true },
            });

            // If the session has an active organization, we'll update the user's default organization
            if (currentSession?.activeOrganizationId) {
              await db.user.update({
                where: { id: session.userId },
                data: { defaultOrganizationId: currentSession.activeOrganizationId },
              });
            }
          }
        },
      },
    },
  },
  // Enable email and password authentication
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await email.sendResetPasswordEmail({
        email: user.email,
        resetLink: url,
      });
    },
  },
  // If your API and frontend are on the same top-level domain, you can remove this
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      partitioned: true,
    },
  },
  // Cache the cookie for 5 minutes on the frontend
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  // The various plugins we're using
  plugins: [
    admin(),
    organization({
      schema: {
        organization: {
          additionalFields: {
            isPersonal: {
              type: 'boolean',
              required: false,
              returned: true,
            },
          },
        },
      },
    }),
    apiKey(),
    stripe({
      stripeClient,
      stripeWebhookSecret: (env as Record<string, string>).STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: true,
      // Configure stripe plans
      subscription: {
        enabled: true,
        plans: Object.values(plans).filter((plan) => !!plan.priceId),
      },
    }),
  ],
} satisfies BetterAuthOptions;

/** Our Better Auth instance */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
export const auth = betterAuth(authConfig) as ReturnType<typeof betterAuth<typeof authConfig>>;

/** The type of the auth session object */
export type AuthSession = typeof auth.$Infer.Session.session;
/** The type of the auth user object */
export type AuthUser = typeof auth.$Infer.Session.user;
