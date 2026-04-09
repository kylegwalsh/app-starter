import { config } from '@repo/config';
import { CORS_ALLOW_HEADERS, CORS_EXPOSE_HEADERS } from '@repo/constants';
import { cors } from 'hono/cors';

/** CORS middleware — allows requests from our frontend apps */
export const corsMiddleware = cors({
  origin: [config.app.url, config.admin.url].filter(Boolean) as string[],
  credentials: true,
  allowHeaders: [...CORS_ALLOW_HEADERS],
  exposeHeaders: [...CORS_EXPOSE_HEADERS],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
