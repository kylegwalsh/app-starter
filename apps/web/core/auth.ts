import { stripeClient } from '@better-auth/stripe/client';
import { config } from '@repo/config';
import {
  adminClient,
  inferAdditionalFields,
  inferOrgAdditionalFields,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import type { auth as backendAuth } from '../../backend/core/auth';

/** Our Better Auth client */
export const auth = createAuthClient({
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
});
