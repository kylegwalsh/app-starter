import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { config } from '@repo/config';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { createMcpServer } from '@/ai/mcp/server';

/** MCP sub-app — mounted at /mcp in the main API */
const mcpApp = new Hono();

// Health check
mcpApp.get('/health', (c) => c.json({ status: 'ok' }));

// MCP Streamable HTTP endpoint
mcpApp.all('/', async (c) => {
  // Extract and validate the Bearer token via Better Auth
  const authHeader = c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
  }

  // Validate the token against Better Auth
  const sessionResponse = await fetch(`${config.api.url}/api/auth/get-session`, {
    headers: { authorization: authHeader },
  });
  if (!sessionResponse.ok) {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }

  const sessionData = (await sessionResponse.json()) as { user?: { id: string } };
  const session = {
    accessToken: authHeader.replace('Bearer ', ''),
    userId: sessionData.user?.id,
  };

  // Create a fresh MCP server for this request (stateless)
  const server = createMcpServer({ session });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless — no session tracking
  });

  await server.connect(transport);

  // Pass the raw web standard Request directly to the transport
  return transport.handleRequest(c.req.raw);
});

export { mcpApp };
