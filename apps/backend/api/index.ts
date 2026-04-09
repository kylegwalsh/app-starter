import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { RPCHandler } from '@orpc/server/fetch';
import { config } from '@repo/config';
import { Hono } from 'hono';

import { auth } from '@/core';

import { mcpAdapter, mcpDiscovery } from './adapters';
import { internalDocsPlugin, internalDocsLoginHTML } from './docs';
import { handleHonoError } from './error';
import { cdnCookiesMiddleware, corsMiddleware, timingMiddleware } from './middleware';
import { router } from './routes';
import { chatApp } from './routes/chat';

// ---------- CONFIGURATION ----------
// Our global configuration for the hono wrapper

const app = new Hono();

// Global error handler — captures all unhandled errors
app.onError(handleHonoError);

// Global middleware
app.use('*', corsMiddleware);
app.use('*', timingMiddleware);

// ---------- SPECIAL ROUTES ----------
// These routes expect raw requests and different transport protocols than the main API (oRPC)

// Authentication routes (handled by Better Auth)
app.on(['GET', 'POST'], ['/api/auth/*'], (c) => {
  return auth.handler(c.req.raw);
});

// MCP routes + OAuth discovery endpoints
app.route('/mcp', mcpAdapter);
app.route('/.well-known', mcpDiscovery);

// Chat streaming route (direct Hono — not oRPC — because useChat expects a specific streaming format)
app.route('/api/chat', chatApp);

// A dedicated login for our Swagger docs to authenticate users and set the session cookie
app.get('/api/login', (c) => c.html(internalDocsLoginHTML));

// CDN signed cookies — sets CloudFront cookies for file access on auth'd requests
app.use('/rpc/*', cdnCookiesMiddleware);

// ---------- MAIN API (oRPC) ----------
// We use oRPC to benefit from e2e type safety, validation, and auto-generated react hooks

/** Create an oRPC handler that hono can use to handle oRPC requests */
const rpcHandler = new RPCHandler(router);

/** Create an OpenAPI handler from oRPC that can be hit via Postman (also includes docs) */
const openApiHandler = new OpenAPIHandler(router, {
  // Generate the swagger docs for our oRPC API
  // Note that we only do it for our internal API when running locally currently, but it would
  // be easy to create a v1/ API route for public use and filter to only show those routes below
  plugins: !config.isDeployment ? [internalDocsPlugin] : [],
});

// Handle our internal RPC requests (from web app)
app.all('/rpc/*', async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/rpc',
    context: { headers: new Headers(c.req.raw.headers) },
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

// Handle external API requests (from Postman or other tools)
app.all('/api/*', async (c, next) => {
  const { matched, response } = await openApiHandler.handle(c.req.raw, {
    prefix: '/api',
    context: { headers: new Headers(c.req.raw.headers) },
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

export { app };
