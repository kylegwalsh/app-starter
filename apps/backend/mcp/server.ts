import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '@repo/config';

// oxlint-disable-next-line no-namespace: Namespace import used to auto-register all exported tools
import * as tools from './tools';
import type { McpSession, McpTool } from './utils';

/** Create a new MCP server instance with all tools registered */
export const createMcpServer = ({ session }: { session: McpSession }) => {
  const server = new McpServer({
    name: config.app.name,
    version: '1.0.0',
  });

  // Auto-register all exported tools
  for (const tool of Object.values(tools) as unknown as McpTool[]) {
    // Just in case someone exports a non-tool, we skip here
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

  return server;
};
