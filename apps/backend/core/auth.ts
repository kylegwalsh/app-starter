import { oauthProvider } from '@better-auth/oauth-provider';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import type { Organization } from '@prisma/client';
import { analytics } from '@repo/analytics';
import { config, env } from '@repo/config';
import { email } from '@repo/email';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { createAuthMiddleware, getSessionFromCtx, isAPIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { admin as adminPlugin, jwt, organization as organizationPlugin } from 'better-auth/plugins';

import { db } from '@/db';

import { stripePluginInstance } from './stripe';

// ---------- HELPERS ----------
/**
 * Whether the system should support personal organizations.
 * A valid use case for not supporting them is if you want to manually create organizations and invite users.
 */
const SUPPORT_PERSONAL_ORGANIZATIONS = true;

/**
 * Extract the base domain from the API URL (e.g. `api.example.com` → `example.com`).
 * Falls back to an empty string when the URL is missing — happens transiently
 * during SST live mode before the gateway link finishes resolving.
 */
const baseDomain = (() => {
  try {
    return new URL(config.api.url).hostname.split('.').slice(-2).join('.');
  } catch {
    return '';
  }
})();

/** Get or create a personal organization for a user */
const getOrCreatePersonalOrganization = async ({ userId }: { userId: string }) => {
  // First, try to find existing personal organization for this user
  const existingPersonalOrg = await db.organization.findFirst({
    where: {
      isPersonal: true,
      members: {
        some: {
          userId,
          role: 'owner',
        },
      },
    },
  });
  if (existingPersonalOrg) {
    return existingPersonalOrg;
  }

  // If we haven't created one, create a new personal organization
  const personalOrg = await db.organization.create({
    data: {
      name: 'Personal account',
      isPersonal: true,
      members: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
  });

  return personalOrg;
};

/**
 * Organization routes that change which organizations a user belongs to. Better Auth updates the
 * session row for these but not the cached session cookie, so we re-sync it afterwards.
 */
const MEMBERSHIP_CHANGE_PATHS = new Set([
  '/organization/accept-invitation',
  '/organization/delete',
  '/organization/leave',
]);

/** Get the active organization for a user */
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
            userId,
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
                userId,
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
  return activeOrganization;
};

/**
 * After membership changes, make sure the session points at an organization the user belongs to and
 * refresh the session cookie, so the frontend sees the change now instead of when the cookie cache expires.
 */
const syncActiveOrganization = createAuthMiddleware(async (ctx) => {
  // Only run this if it's one of the paths that triggers membership change
  if (!MEMBERSHIP_CHANGE_PATHS.has(ctx.path) || isAPIError(ctx.context.returned)) {
    return;
  }

  // The session in the request context is stale, so re-read it from the database
  const requestSession = await getSessionFromCtx(ctx);
  if (!requestSession) {
    return;
  }
  const { token } = requestSession.session;
  const current = await ctx.context.internalAdapter.findSession(token);
  if (!current) {
    return;
  }

  // Leaving or deleting the active organization clears it, so fall back to another one
  let { session } = current;
  if (!session.activeOrganizationId) {
    const user = await db.user.findUnique({
      where: { id: current.user.id },
      select: { defaultOrganizationId: true },
    });
    const activeOrganization = await getActiveOrganization({
      userId: current.user.id,
      defaultOrganizationId: user?.defaultOrganizationId,
    });
    if (activeOrganization) {
      session =
        (await ctx.context.internalAdapter.updateSession(token, {
          activeOrganizationId: activeOrganization.id,
        })) ?? session;
    }
  }

  await setSessionCookie(ctx, { session, user: current.user });
});

// ---------- CONFIG ----------
/** The config for our Better Auth instance (defined separately to avoid TypeScript issues) */
const authConfig = {
  secret: env.BETTER_AUTH_SECRET,
  // Use the bare origin + `/api/auth` so Better Auth's router basePath matches
  // the path Lambda receives (API Gateway v1 strips the stage segment before
  // invoking us). The frontend still posts to `${config.api.url}/api/auth/...`
  // so requests reach the right stage.
  baseURL: URL.canParse(config.api.url) ? new URL(config.api.url).origin : '',
  appName: config.app.name,
  // Disable the JWT plugin's /token endpoint to avoid conflict with oauth-provider's /oauth2/token
  disabledPaths: ['/token'],
  trustedOrigins: [config.app.url, config.admin.url].filter(Boolean) as string[],
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
          let organizationId = '';

          // If we support personal organizations, we'll create a personal organization for the user
          if (SUPPORT_PERSONAL_ORGANIZATIONS) {
            const organization = await getOrCreatePersonalOrganization({
              userId: user.id,
            });
            organizationId = organization.id;
            // Track the organization creation
            await analytics.organizationIdentify({
              organizationId: organization.id,
              traits: {
                name: organization.name,
                createdAt: organization.createdAt,
              },
            });
          }

          // Track the user creation
          await analytics.identify({
            userId: user.id,
            traits: {
              email: user.email,
              name: user.name,
              createdAt: user.createdAt,
            },
          });
          await analytics.userSignedUp({
            userId: user.id,
            organizationId,
            email: user.email,
            name: user.name,
          });
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
                // Add the active organization to the session (if they have one)
                activeOrganizationId: activeOrganization?.id,
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
                data: {
                  defaultOrganizationId: currentSession.activeOrganizationId,
                },
              });
            }
          }
        },
      },
    },
  },
  // Keep the session cookie in sync with organization membership changes
  hooks: {
    after: syncActiveOrganization,
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
  // Share cookies across subdomains (app.*, admin.*, api.*) when using a custom domain for a deployment.
  // When no custom domain is set (e.g. *.amazonaws.com) or running locally, fall back to sameSite: 'none' for cross-origin access.
  advanced: {
    cookiePrefix: config.isProd ? 'better-auth' : `better-auth-${config.stage}`,
    defaultCookieAttributes:
      config.isDeployment && config.hasCustomDomain
        ? {
            // Scope the cookie to be restricted to the correct subdomain
            domain: config.isProd ? `.${baseDomain}` : `.${config.stage}.${baseDomain}`,
            sameSite: 'lax' as const,
            secure: true,
          }
        : {
            sameSite: 'none' as const,
            secure: true,
            partitioned: true,
          },
  },
  // Cache the cookie for 5 minutes on the frontend
  session: {
    storeSessionInDatabase: true,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  // The various plugins we're using
  plugins: [
    // Enable admin support (for admin panel)
    adminPlugin(),
    // Enable OAuth support (for MCP clients)
    jwt(),
    oauthProvider({
      loginPage: `${config.app.url}/auth/sign-in`,
      consentPage: `${config.app.url}/authorize`,
      // Allow MCP clients to register dynamically without a session
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      // We need to include a trailing slash because some MCP clients expect it
      validAudiences: [config.api.url, `${config.api.url}/`],
      // Silence the setup guidance from the oauth plugin
      silenceWarnings: {
        oauthAuthServerConfig: true,
      },
    }),
    // Enable organization support (core relation in our database models)
    organizationPlugin({
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
      // Enable organization invite emails
      sendInvitationEmail: config.posthog.email.templates.inviteToOrganization
        ? async ({ email: recipient, organization, invitation }) => {
            await email.sendInvitationEmail({
              email: recipient,
              organizationName: organization.name,
              invitationId: invitation.id,
            });
          }
        : undefined,
      // Whenever we create a new organization, we'll track it
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          await analytics.organizationIdentify({
            organizationId: organization.id,
            traits: {
              name: organization.name,
              createdAt: organization.createdAt,
            },
          });
          await analytics.organizationCreated({
            userId: user.id,
            organizationId: organization.id,
            name: organization.name,
          });
        },
      },
    }),
    // Enable stripe support (for billing)
    ...(stripePluginInstance ? [stripePluginInstance] : []),
  ],
} satisfies BetterAuthOptions;

/** Our Better Auth instance */
export const auth = betterAuth(authConfig) as ReturnType<typeof betterAuth<typeof authConfig>>;

/** The type of the auth session object */
export type AuthSession = typeof auth.$Infer.Session.session;
/** The type of the auth user object */
export type AuthUser = typeof auth.$Infer.Session.user;
/** The type of the auth organization object */
export type AuthOrganization = typeof auth.$Infer.Organization;
