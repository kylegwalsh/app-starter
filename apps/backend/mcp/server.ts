import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { config } from '@repo/config';

// oxlint-disable-next-line no-namespace: Namespace import used to auto-register all exported tools
import * as tools from './tools';
import type { McpSession, McpTool } from './utils';

/**
 * Create a transport that reconstitutes sessions across Lambda invocations.
 * The first request (initialize) has no session ID — generates a new one.
 * Subsequent requests carry the mcp-session-id header — restores that session.
 */
export const createMcpTransport = ({ sessionId }: { sessionId: string | null }) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: sessionId ? () => sessionId : () => crypto.randomUUID(),
  });

  // Ensure we initialize the transport with the session ID if it's provided
  if (sessionId) {
    transport.sessionId = sessionId;
    // @ts-expect-error — _initialized is normally meant to be private, but we need to set it true for lambda since it's stateless
    transport._initialized = true;
  }

  return transport;
};

/** Create a new MCP server instance with all tools registered */
export const createMcpServer = ({ session }: { session?: McpSession }) => {
  const server = new McpServer({
    name: config.app.name,
    version: '1.0.0',
  });

  // Auto-register all exported tools (skip on init requests where session isn't resolved yet)
  if (session) {
    for (const tool of Object.values(tools) as unknown as McpTool[]) {
      if (!('isTool' in tool && tool.isTool)) {
        continue;
      }

      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        },
        (args) => tool.handler(args, session),
      );
    }
  }

  return server;
};
