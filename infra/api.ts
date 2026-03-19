import { gateway } from './gateway';

// Import our apps so that we can access their URLs in our functions
const { web } = await import('./web');
const { admin } = await import('./admin');

/** We use a special function for our auth routes (handled by Better Auth) */
const authHandler = new sst.aws.Function('authHandler', {
  handler: 'apps/backend/functions/auth.handler',
  link: [gateway, web, admin],
});

/** We use one function for all of our standard routes (handled by tRPC + openapi) */
const apiHandler = new sst.aws.Function('apiHandler', {
  handler: 'apps/backend/functions/api.handler',
  link: [gateway, web, admin],
});

/** We use a dedicated function for MCP (Model Context Protocol) routes */
const mcpHandler = new sst.aws.Function('mcpHandler', {
  handler: 'apps/backend/functions/mcp.handler',
  link: [gateway, web, admin],
});

// Auth routes
gateway.route('GET /api/auth/{path+}', authHandler.arn);
gateway.route('POST /api/auth/{path+}', authHandler.arn);

// tRPC routes
gateway.route('GET /trpc/{path+}', apiHandler.arn);
gateway.route('POST /trpc/{path+}', apiHandler.arn);

// REST routes
gateway.route('GET /api/{path+}', apiHandler.arn);
gateway.route('POST /api/{path+}', apiHandler.arn);
gateway.route('PUT /api/{path+}', apiHandler.arn);
gateway.route('DELETE /api/{path+}', apiHandler.arn);
gateway.route('PATCH /api/{path+}', apiHandler.arn);

// Swagger docs (for REST routes)
gateway.route('GET /docs', apiHandler.arn);

// MCP (Model Context Protocol) routes
gateway.route('GET /mcp', mcpHandler.arn);
gateway.route('POST /mcp', mcpHandler.arn);
gateway.route('DELETE /mcp', mcpHandler.arn);
gateway.route('GET /mcp/{path+}', mcpHandler.arn);

// OAuth discovery (proxied via MCP handler)
gateway.route('GET /.well-known/{path+}', mcpHandler.arn);
