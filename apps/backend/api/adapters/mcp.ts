import { mcpHandler, oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { config } from '@repo/config';
import { addLogMetadata } from '@repo/logs';
import { Hono } from 'hono';

import { createMcpServer, createMcpTransport } from '@/ai/mcp/server';
import { resolveMcpSession } from '@/ai/mcp/session';
import { auth } from '@/core';

// ---------- BASE MCP HANDLER (/mcp/*) ----------
/** MCP sub-app — mounted at /mcp in the main API */
const mcpAdapter = new Hono();

/** The base URL for the auth API */
const baseAuthUrl = `${config.api.url}/api/auth`;

// Health check specifically for the MCP server
mcpAdapter.get('/health', (c) => c.json({ status: 'ok' }));

/** The MCP handler */
const handler = mcpHandler(
  // The auth details for the MCP server to verify OAuth tokens
  {
    jwksUrl: `${baseAuthUrl}/jwks`,
    verifyOptions: {
      issuer: baseAuthUrl,
      audience: [
        config.api.url,
        `${config.api.url}/`,
        baseAuthUrl,
        `${baseAuthUrl}/`,
        `${baseAuthUrl}/oauth2/userinfo`,
      ],
    },
  },
  // The MCP handler function
  async (req, jwt) => {
    // Create a streamable http transport that will be used to communicate with the MCP server
    const transport = createMcpTransport({ sessionId: req.headers.get('mcp-session-id') });

    // Resolve session for authenticated requests (connection requests have no session ID or user yet)
    const session =
      transport.sessionId && jwt.sub
        ? await resolveMcpSession({ sessionId: transport.sessionId, userId: jwt.sub })
        : undefined;

    // Enrich logs with MCP session context
    if (session) {
      addLogMetadata({
        mcpSessionId: session.id,
        userId: session.user.id,
        organizationId: session.organization.id,
      });
    }

    // Create a new MCP server instance with all tools registered
    const server = createMcpServer({ session });
    // Connect the MCP server to the transport
    await server.connect(transport);

    // Handle the request
    return transport.handleRequest(req);
  },
);

// Our primary MCP entrypoint
mcpAdapter.all('/', async (c) => {
  return handler(c.req.raw);
});

// ---------- MCP DISCOVERY ENDPOINTS (/.well-known/*) ----------
/** OAuth discovery endpoints required by MCP clients — mounted at /.well-known in the main API */
const mcpDiscovery = new Hono();

// OAuth authorization server metadata (Better Auth OAuth provider)
const discoveryHandler = oauthProviderAuthServerMetadata(auth);
mcpDiscovery.get('/oauth-authorization-server', async (c) => {
  return discoveryHandler(c.req.raw);
});

// OAuth protected resource metadata
mcpDiscovery.get('/oauth-protected-resource', (c) => {
  const origin = new URL(config.api.url).origin;
  return c.json({
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    bearer_methods_supported: ['header'],
  });
});

export { mcpAdapter, mcpDiscovery };
