import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '@repo/config';

// oxlint-disable-next-line no-namespace: Namespace import used to auto-register all exported tools
import * as tools from '../tools';
import type { AiTool, ToolSession } from '../utils';

/** Create a new MCP server instance with all MCP-supported tools registered */
export const createMcpServer = ({ session }: { session: ToolSession }) => {
  const server = new McpServer({
    name: config.app.name,
    version: '1.0.0',
  });

  // Auto-register all exported tools that support MCP
  for (const tool of Object.values(tools) as unknown as AiTool[]) {
    if (!('isTool' in tool && tool.isTool)) {
      continue;
    }

    // Skip tools that are chat-only (not MCP supported)
    if (tool.mcpSupported === false) {
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
