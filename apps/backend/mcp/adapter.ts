import type { ToolSet } from 'ai';
import { zodSchema } from 'ai';
import { z } from 'zod';

// oxlint-disable-next-line no-namespace: Namespace import used to auto-register all exported tools
import * as mcpTools from './tools';
import type { McpSession, McpTool } from './utils';

/**
 * Convert our MCP tool definitions into native AI SDK tools.
 * Executes in-process — no network hops, no extra auth round-trips.
 */
export const toAISDKTools = (session: McpSession): ToolSet => {
  const aiTools: ToolSet = {};

  for (const exported of Object.values(mcpTools) as unknown as McpTool[]) {
    if (!('isTool' in exported && exported.isTool)) {
      continue;
    }

    const schema = exported.inputSchema
      ? z.object(exported.inputSchema as z.ZodRawShape)
      : z.object({});

    aiTools[exported.name] = {
      description: exported.description,
      inputSchema: zodSchema(schema),
      execute: async (args: z.output<typeof schema>) => {
        const result = await exported.handler(args, session);
        if (result.isError) {
          throw new TypeError(result.content.map((c) => c.text).join('\n'));
        }
        return result.content.map((c) => c.text).join('\n');
      },
    };
  }

  return aiTools;
};
