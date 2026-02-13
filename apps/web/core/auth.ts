import type { auth as backendAuth } from '../../backend/core/auth';
import { stripeClient } from '@better-auth/stripe/client';
import { config } from '@repo/config';
import {
  adminClient,
  inferAdditionalFields,
  inferOrgAdditionalFields,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** The config for our Better Auth client (defined separately to avoid TypeScript issues) */
const authConfig = {
  baseURL: config.api.url,
  // The various plugins we're using
  plugins: [
    inferAdditionalFields<typeof backendAuth>(),
    organizationClient({
      schema: inferOrgAdditionalFields<typeof backendAuth>(),
    }),
    adminClient(),
    stripeClient({ subscription: true }),
  ],
} satisfies Parameters<typeof createAuthClient>[0];

/** Our Better Auth client */
export const auth = createAuthClient(authConfig) as ReturnType<
  typeof createAuthClient<typeof authConfig>
>;
