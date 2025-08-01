import { stripeClient } from '@better-auth/stripe/client';
import { config } from '@repo/config';
import { adminClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Our Better Auth client */
export const auth = createAuthClient({
  baseURL: config.api.url,
  // The various plugins we're using
  plugins: [adminClient(), organizationClient(), stripeClient({ subscription: true })],
});
