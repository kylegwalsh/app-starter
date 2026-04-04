import { config } from '@repo/config';
import { cors } from 'hono/cors';

/** CORS middleware — allows requests from our frontend apps */
export const corsMiddleware = cors({
  origin: [config.app.url, config.admin.url].filter(Boolean) as string[],
  credentials: true,
  allowHeaders: [
    'Accept',
    'Content-Type',
    'Authorization',
    'Cookie',
    'x-posthog-session-id',
    'mcp-session-id',
    'mcp-protocol-version',
    'Last-Event-ID',
  ],
  exposeHeaders: ['Set-Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
