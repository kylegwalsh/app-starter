import { config, env } from '@repo/config';
import { email } from '@repo/email';
import { betterAuth, BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, apiKey, organization } from 'better-auth/plugins';

import { db } from '@/db';

/** The config for our Better Auth instance (defined separately to avoid TypeScript issues) */
const authConfig = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: config.api.url,
  appName: config.app.name,
  trustedOrigins: [config.app.url],
  // Connect to our prisma database
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
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
  plugins: [admin(), organization(), apiKey()],
} satisfies BetterAuthOptions;

/** Our Better Auth instance */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
export const auth = betterAuth(authConfig) as ReturnType<typeof betterAuth<typeof authConfig>>;

/** The type of the auth session object */
export type AuthSession = typeof auth.$Infer.Session.session;
/** The type of the auth user object */
export type AuthUser = typeof auth.$Infer.Session.user;
