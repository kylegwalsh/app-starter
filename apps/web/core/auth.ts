import { config } from '@repo/config';
import { createAuthClient } from 'better-auth/react';

/** Our Better Auth client */
export const auth = createAuthClient({
  baseURL: config.api.url,
});
