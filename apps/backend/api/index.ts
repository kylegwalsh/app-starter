import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { RPCHandler } from '@orpc/server/fetch';
import { config } from '@repo/config';
import { Hono } from 'hono';

import { auth } from '@/core';

import { mcpAdapter } from './adapters';
import { internalDocsPlugin, internalDocsLoginHTML } from './docs';
import { honoErrorHandler } from './error';
import { corsMiddleware, timingMiddleware } from './middleware';
import { router } from './routes';

// ---------- CONFIGURATION ----------
// Our global configuration for the hono wrapper

const app = new Hono();

// Global error handler — captures all unhandled errors
app.onError(honoErrorHandler);

// Global middleware
app.use('*', corsMiddleware);
app.use('*', timingMiddleware);

// ---------- SPECIAL ROUTES ----------
// These routes expect raw requests and different transport protocols than the main API (oRPC)

// OAuth discovery — served at root because mcp-remote looks here, but the oauth-provider
// plugin registers it under /api/auth due to basePath
const discoveryHandler = oauthProviderAuthServerMetadata(auth);
app.get('/.well-known/oauth-authorization-server', async (c) => {
  return discoveryHandler(c.req.raw);
});

// Protected resource metadata — tells MCP clients where the auth server is
app.get('/.well-known/oauth-protected-resource', (c) => {
  const origin = new URL(config.api.url).origin;
  return c.json({
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    bearer_methods_supported: ['header'],
  });
});

// Authentication routes (handled by Better Auth)
app.on(['GET', 'POST'], ['/api/auth/*'], (c) => {
  return auth.handler(c.req.raw);
});

// MCP routes
app.route('/mcp', mcpAdapter);

// A dedicated login for our Swagger docs to authenticate users and set the session cookie
app.get('/api/login', (c) => c.html(internalDocsLoginHTML));

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
