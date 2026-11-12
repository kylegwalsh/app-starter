import { oauthProviderClient } from '@better-auth/oauth-provider/client';
import { stripeClient } from '@better-auth/stripe/client';
import { config } from '@repo/config';
import {
  adminClient,
  inferAdditionalFields,
  inferOrgAdditionalFields,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import type { auth as backendAuth } from '../../backend/services/auth';

/** The config for our Better Auth client (defined separately to avoid TypeScript issues) */
const authConfig = {
  // Better Auth's `withPath` skips appending the default `/api/auth` whenever
  // baseURL already has any path. When there's no custom domain, our API URL
  // already carries a `/${stage}` path, so we must spell out `/api/auth`
  // explicitly — otherwise the client posts to `${baseURL}/<action>` directly
  // (e.g. `/kwalsh/get-session`) and misses the Hono `/api/auth/*` mount.
  baseURL: `${config.api.url}/api/auth`,
  // We must set the accept header to application/json to ensure the browser
  // redirects the user correctly during the OAuth consent flow
  fetchOptions: {
    onRequest(context) {
      context.headers.set('accept', 'application/json');
    },
  },
  // The various plugins we're using
  plugins: [
    inferAdditionalFields<typeof backendAuth>(),
    organizationClient({
      schema: inferOrgAdditionalFields<typeof backendAuth>(),
    }),
    adminClient(),
    oauthProviderClient(),
    stripeClient({ subscription: true }),
  ],
} satisfies Parameters<typeof createAuthClient>[0];

/** Our Better Auth client */
export const auth = createAuthClient(authConfig) as ReturnType<
  typeof createAuthClient<typeof authConfig>
>;
