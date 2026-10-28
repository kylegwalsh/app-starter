import type { ToolSet } from 'ai';
import { z } from 'zod';

// oxlint-disable-next-line no-namespace -- Namespace import used to auto-register all exported tools
import * as allTools from './tools';
import { runTool, type AiTool, type ToolSession } from './utils';

/** Convert our tool definitions into native AI SDK tools */
export const toAiSdkTools = (session: Omit<ToolSession, 'consumer'>): ToolSet => {
  /** Our list of AI SDK compatible tools */
  const aiTools: ToolSet = {};

  // Auto-register all exported tools that support chat
  const tools: AiTool[] = Object.values(allTools);
  for (const tool of tools) {
    // Skip tools that aren't exposed via chat
    if (!tool.consumers.includes('chat')) {
      continue;
    }

    /** Wrap the underlying schema with a Zod object for AI SDK compatibility */
    const schema = tool.inputSchema ? z.object(tool.inputSchema) : z.object({});

    // Format the tool for the AI SDK. `runTool` handles logging + error capture
    // so the model sees a structured error payload it can recover from instead
    // of the stream tearing down on a thrown handler.
    aiTools[tool.name] = {
      description: tool.description,
      inputSchema: schema,
      execute: async (args: z.output<typeof schema>) => {
        const outcome = await runTool({ tool, args, session: { ...session, consumer: 'chat' } });
        if (outcome.ok) {
          return outcome.result;
        }
        throw new Error(`Tool "${tool.name}" failed: ${outcome.message}`);
      },
    };
  }

  return aiTools;
};
