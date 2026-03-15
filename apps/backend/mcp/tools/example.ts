import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { db } from '@/db';
import type { McpSession } from '@/mcp/auth';

/** Register the example `get-current-user` tool on the MCP server */
export const registerExampleTool = (server: McpServer, { session }: { session: McpSession }) => {
  server.tool('get-current-user', 'Returns the authenticated user profile', {}, async () => {
    if (!session.userId) {
      return {
        content: [{ type: 'text' as const, text: 'Not authenticated' }],
        isError: true,
      };
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return {
        content: [{ type: 'text' as const, text: 'User not found' }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(user) }],
    };
  });
};
