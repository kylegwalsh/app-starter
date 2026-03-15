// eslint-disable-next-line typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-member-access -- MCP SDK types are loosely typed
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { analytics } from '@repo/analytics';
import { config } from '@repo/config';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import { withLambdaContext } from '@/core';
import { authURL } from '@/mcp/auth';
import { createMcpServer } from '@/mcp/server';

/** Transport response shape from the MCP SDK */
type TransportResponse = {
  body: BodyInit | null;
  statusCode: number;
  headers: Record<string, string>;
};

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

    const sessionData: { user?: { id: string } } = await sessionResponse.json();
    const session = {
      accessToken: token,
      userId: sessionData.user?.id,
    };

    // Create a fresh MCP server for this request (stateless)
    const server = createMcpServer({ session });

    // eslint-disable-next-line typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-call -- MCP SDK constructor
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless — no session tracking
    });

    await server.connect(transport);

    // Convert the Hono request to something the transport can handle
    const body = c.req.method === 'POST' ? ((await c.req.json()) as unknown) : undefined;
    const headers = Object.fromEntries(c.req.raw.headers.entries());

    // eslint-disable-next-line typescript-eslint/no-unsafe-call, typescript-eslint/no-unsafe-member-access -- MCP SDK method
    const response = (await transport.handleRequest({
      method: c.req.method,
      url: new URL(c.req.url).pathname,
      headers,
      body,
    })) as TransportResponse;

    // Build the response from the transport result
    return new Response(response.body, {
      status: response.statusCode,
      headers: response.headers,
    });
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
    const metadata: Record<string, unknown> = await response.json();
    return c.json(metadata);
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'Failed to fetch OAuth metadata' }, 502);
  }
});

app.get('/.well-known/oauth-protected-resource', async (c) => {
  try {
    const response = await fetch(`${config.api.url}/api/auth/.well-known/oauth-protected-resource`);
    const metadata: Record<string, unknown> = await response.json();
    return c.json(metadata);
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'Failed to fetch resource metadata' }, 502);
  }
});

/** The main entry point for the MCP API */
// @ts-expect-error - The event type for the handler is slightly different from the true AWS event type
export const handler = withLambdaContext<'api'>(handle(app));
