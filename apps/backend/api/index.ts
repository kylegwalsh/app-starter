import { config } from '@repo/config';
import { Hono } from 'hono';

import { auth } from '@/core';

import { mcpAdapter, mcpDiscovery } from './adapters';
import { internalDocsLoginHTML, mountInternalDocs } from './docs';
import { handleHonoError } from './error';
import { corsMiddleware, timeoutMiddleware, timingMiddleware } from './middleware';
import { router } from './routes';

// ---------- CONFIGURATION ----------
// Our global configuration for the hono wrapper

const app = new Hono();

// Global error handler — captures all unhandled errors
app.onError(handleHonoError);

// Global middleware
app.use('*', corsMiddleware);
app.use('*', timingMiddleware);
app.use('*', timeoutMiddleware);

// ---------- SPECIAL ROUTES ----------
// These routes expect raw requests and different transport protocols than the main API

// Authentication routes (handled by Better Auth)
app.on(['GET', 'POST'], ['/api/auth/*'], async (c) => {
  return auth.handler(c.req.raw);
});

// MCP routes + OAuth discovery endpoints
app.route('/mcp', mcpAdapter);
app.route('/.well-known', mcpDiscovery);

// A dedicated login for our Swagger docs to authenticate users and set the session cookie
app.get('/api/login', (c) => c.html(internalDocsLoginHTML));

// ---------- MAIN API ----------
// Native Hono routes give us e2e type safety via the `hc` client, request
// validation, and — through hono-openapi — a generated OpenAPI spec.

// Generate the swagger docs for our API
// Note that we only do it for our internal API when running locally currently, but it would
// be easy to create a v1/ API route for public use and filter to only show those routes below
if (!config.isDeployment) {
  mountInternalDocs(app, router);
}

// Mount the API under /api so external consumers and the typed client share one surface
app.route('/api', router);

export { app };
