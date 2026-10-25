import { config } from '@repo/config';
import { hc } from 'hono/client';

import type { AppRouter } from '../../backend/api/routes';

/** Typed Hono client for the (public) backend endpoints this site calls (no session) */
export const api = hc<AppRouter>(`${config.api.url}/api`);
