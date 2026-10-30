import { config } from '@repo/config';
import { HonoReactQuery } from 'hono-tanstack-query';
import { hc } from 'hono/client';
import { posthog } from 'posthog-js';

import type { AppRouter } from '../../backend/api/router';

import { getQueryClient } from './query-client';

/** Base URL for the API — routes are mounted under /api on the backend */
export const apiUrl = `${config.api.url}/api`;

/** Typed Hono client — use directly for streaming endpoints */
export const client = hc<AppRouter>(apiUrl, {
  headers: (): Record<string, string> => {
    const sessionId = typeof window !== 'undefined' ? posthog.get_session_id() : undefined;
    return sessionId ? { 'x-posthog-session-id': sessionId } : {};
  },
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, credentials: 'include' }),
});

/**
 * TanStack Query bindings for the API — use with useQuery/useMutation.
 *
 * `invalidation: 'none'` keeps mutations from auto-invalidating sibling queries.
 * Several call sites (conversation rename in particular) rely on their optimistic
 * cache write standing on its own; an automatic refetch would re-sort the list.
 */
export const api = HonoReactQuery(client, {
  queryClient: getQueryClient(),
  invalidation: 'none',
});
