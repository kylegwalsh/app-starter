import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { analytics } from '@repo/analytics';
import { config } from '@repo/config';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import { withLambdaContext } from '@/core';
import { authURL } from '@/mcp/auth';
import { createMcpServer } from '@/mcp/server';

/** Create a hono instance to handle routing for our MCP routes */
const app = new Hono();

// Health check
app.get('/mcp/health', (c) => c.json({ status: 'ok' }));

// MCP Streamable HTTP endpoint
app.all('/mcp', async (c) => {
  try {
    // Extract and validate the Bearer token via Better Auth
    const authHeader = c.req.header('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.slice(7);

    // Validate the token against Better Auth
    const sessionResponse = await fetch(`${authURL}/get-session`, {
      headers: { authorization: `Bearer ${token}` },
    });

    if (!sessionResponse.ok) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const sessionData = (await sessionResponse.json()) as { user?: { id: string } };
    const session = {
      accessToken: token,
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
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// OAuth discovery proxy — redirect well-known requests to Better Auth
app.get('/.well-known/oauth-authorization-server', async (c) => {
  try {
    const response = await fetch(
      `${config.api.url}/api/auth/.well-known/oauth-authorization-server`,
    );
    const metadata = (await response.json()) as Record<string, unknown>;
    return c.json(metadata);
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'Failed to fetch OAuth metadata' }, 502);
  }
});

app.get('/.well-known/oauth-protected-resource', async (c) => {
  try {
    const response = await fetch(`${config.api.url}/api/auth/.well-known/oauth-protected-resource`);
    const metadata = (await response.json()) as Record<string, unknown>;
    return c.json(metadata);
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'Failed to fetch resource metadata' }, 502);
  }
});

/** The main entry point for the MCP API */
// @ts-expect-error - The event type for the handler is slightly different from the true AWS event type
export const handler = withLambdaContext<'api'>(handle(app));
