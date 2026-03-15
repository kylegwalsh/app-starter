import { createMCPClient } from '@ai-sdk/mcp';
import { config } from '@repo/config';

/** Create an MCP client for internal use (backend calling its own MCP server) */
export const createAppMCPClient = async (sessionToken: string) => {
  return createMCPClient({
    transport: {
      type: 'http',
      url: `${config.api.url}/mcp`,
      headers: { Authorization: `Bearer ${sessionToken}` },
    },
  });
};
