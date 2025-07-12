import { config, env } from '@repo/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { db } from '@/db';

/** Our Better Auth instance */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  // Where our frontend is hosted
  baseURL: config.app.url,
  // Connect to our prisma database
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  // Enable email and password authentication
  emailAndPassword: {
    enabled: true,
  },
});
