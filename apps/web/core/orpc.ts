import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { InferRouterOutputs, RouterClient } from '@orpc/server';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { config } from '@repo/config';
import { posthog } from 'posthog-js';

import type { AppRouter } from '../../backend/routes';

/** oRPC link configured to communicate with our backend */
const link = new RPCLink({
  url: config.api.url,
  headers: () => {
    const sessionId = typeof window !== 'undefined' ? posthog.get_session_id() : undefined;
    return sessionId ? { 'x-posthog-session-id': sessionId } : {};
  },
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});

/** Typed oRPC client */
const client: RouterClient<AppRouter> = createORPCClient(link);

/** TanStack Query utilities for oRPC — use with useQuery/useMutation */
export const orpc = createTanstackQueryUtils(client);

/** Helper type for inferring router output types */
export type RouterOutputs = InferRouterOutputs<AppRouter>;
