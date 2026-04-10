import type { ToolSet } from 'ai';
import { z } from 'zod';

// oxlint-disable-next-line no-namespace: Namespace import used to auto-register all exported tools
import * as allTools from './tools';
import type { AiTool, ToolSession } from './utils';

/** Convert our tool definitions into native AI SDK tools */
export const toAiSdkTools = (session: ToolSession): ToolSet => {
  /** Our list of AI SDK compatible tools */
  const aiTools: ToolSet = {};

  // Auto-register all exported tools that support chat (skip on init requests where session isn't resolved yet)
  for (const tool of Object.values(allTools) as AiTool[]) {
    // Skip non-tool exports
    if (!('isTool' in tool && tool.isTool)) {
      continue;
    }

    // Skip tools that are MCP-only (not chat supported)
    if (tool.chatSupported === false) {
      continue;
    }

    /** Wrap the underlying schema with a Zod object for AI SDK compatibility */
    const schema = tool.inputSchema ? z.object(tool.inputSchema) : z.object({});

    // Format the tool for the AI SDK
    aiTools[tool.name] = {
      description: tool.description,
      inputSchema: schema,
      execute: async (args: z.output<typeof schema>) => {
        return tool.handler(args, session);
      },
    };
  }

  return aiTools;
};
