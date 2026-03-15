import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '@repo/config';

import type { McpSession } from './auth';
import { registerExampleTool } from './tools/example';

/** Create a new MCP server instance with all tools registered */
export const createMcpServer = ({ session }: { session: McpSession }) => {
  const server = new McpServer({
    name: config.app.name,
    version: '1.0.0',
  });

  // Register tools
  registerExampleTool(server, { session });

  return server;
};
