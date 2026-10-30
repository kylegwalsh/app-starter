import { mcpHandler, oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { analytics } from '@repo/analytics';
import { config } from '@repo/config';
import { addLogMetadata, log } from '@repo/logs';
import { Hono } from 'hono';

import { createMcpServer, createMcpTransport } from '@/ai/mcp/server';
import { resolveMcpSession } from '@/ai/mcp/session';
import { auth } from '@/services';

// ---------- BASE MCP HANDLER (/mcp/*) ----------
/** MCP sub-app — mounted at /mcp in the main API */
const mcpAdapter = new Hono();

/** The base URL for the auth API */
const baseAuthUrl = `${config.api.url}/api/auth`;

// Health check specifically for the MCP server
mcpAdapter.get('/health', (c) => c.json({ status: 'ok' }));

/** Records a new MCP connection; best effort, so analytics can never break the handshake */
const trackConnection = async ({
  sessionId,
  userId,
  client,
}: {
  sessionId: string;
  userId: string;
  client?: { name: string; version: string };
}) => {
  try {
    // Resolving creates the session now rather than on the client's next request
    const session = await resolveMcpSession({ sessionId, userId });
    await analytics.mcpClientConnected({
      userId,
      organizationId: session.organization.id,
      sessionId,
      clientName: client?.name,
      clientVersion: client?.version,
    });
  } catch (error) {
    log.warn({ err: error, sessionId }, 'Failed to track MCP connection');
  }
};

/** Handles one MCP request for an authenticated user */
export const handleMcpRequest = async (req: Request, userId: string | undefined) => {
  const sessionHeader = req.headers.get('mcp-session-id');
  // Create a streamable http transport that will be used to communicate with the MCP server
  const transport = createMcpTransport({ sessionId: sessionHeader });

  // Resolve session for authenticated requests (connection requests have no session ID or user yet)
  const session =
    transport.sessionId && userId
      ? await resolveMcpSession({ sessionId: transport.sessionId, userId })
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
  const response = await transport.handleRequest(req);

  // A request without a session ID that leaves one behind was a successful initialize handshake
  if (!sessionHeader && transport.sessionId && userId) {
    await trackConnection({
      sessionId: transport.sessionId,
      userId,
      client: server.server.getClientVersion(),
    });
  }

  return response;
};

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
  (req, jwt) => handleMcpRequest(req, jwt.sub),
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
mcpDiscovery.get(`/oauth-authorization-server${new URL(baseAuthUrl).pathname}`, async (c) => {
  return discoveryHandler(c.req.raw);
});

// OAuth protected resource metadata
mcpDiscovery.get('/oauth-protected-resource', (c) => {
  const origin = new URL(config.api.url).origin;
  return c.json({
    resource: origin,
    // Must match the issuer in the authorization server metadata, or strict clients reject it
    authorization_servers: [baseAuthUrl],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    bearer_methods_supported: ['header'],
  });
});

export { mcpAdapter, mcpDiscovery };
