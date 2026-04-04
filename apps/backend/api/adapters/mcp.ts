import { mcpHandler } from '@better-auth/oauth-provider';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { config } from '@repo/config';
import { Hono } from 'hono';

import { createMcpServer } from '@/ai/mcp/server';

/** MCP sub-app — mounted at /mcp in the main API */
const mcpAdapter = new Hono();

// Health check
mcpAdapter.get('/health', (c) => c.json({ status: 'ok' }));

// Verify OAuth tokens and handle MCP requests
const baseAuthUrl = `${config.api.url}/api/auth`;
const handler = mcpHandler(
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
  async (req, jwt) => {
    // Create a fresh MCP server for this request (stateless)
    const server = createMcpServer({
      session: {
        accessToken: req.headers.get('authorization')?.replace('Bearer ', '') ?? '',
        userId: jwt.sub,
      },
    });

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless — no session tracking
    });

    await server.connect(transport);

    return transport.handleRequest(req);
  },
);

// MCP Streamable HTTP endpoint
mcpAdapter.all('/', async (c) => {
  return handler(c.req.raw);
});

export { mcpAdapter };
