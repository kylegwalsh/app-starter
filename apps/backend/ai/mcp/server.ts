import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { config } from '@repo/config';

import { handleError } from '@/api/error';

// oxlint-disable-next-line no-namespace: Namespace import used to auto-register all exported tools
import * as tools from '../tools';
import type { AiTool, ToolSession } from '../utils';

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

/** Create a new MCP server instance with all MCP-supported tools registered */
export const createMcpServer = ({ session }: { session?: ToolSession }) => {
  const server = new McpServer({
    name: config.app.name,
    version: '1.0.0',
  });

  // Auto-register all exported tools that support MCP (skip on init requests where session isn't resolved yet)
  for (const tool of Object.values(tools) as AiTool[]) {
    if (!('isTool' in tool && tool.isTool)) {
      continue;
    }

    // Skip tools that are chat-only (not MCP supported)
    if (tool.mcpSupported === false) {
      continue;
    }

    // Register the tool with the MCP server
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      async (args) => {
        try {
          const text = await tool.handler(args, session!);
          return { content: [{ type: 'text' as const, text }] };
        } catch (error) {
          await handleError({ error });
          const message = error instanceof Error ? error.message : 'Tool execution failed';
          return { content: [{ type: 'text' as const, text: message }], isError: true };
        }
      },
    );
  }

  return server;
};
