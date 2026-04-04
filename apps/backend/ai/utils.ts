import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

/** The type representing an authenticated tool session */
export type ToolSession = {
  accessToken: string;
  userId?: string;
  conversationId?: string;
};

/** The result returned by a tool handler */
export type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

/** Definition for a tool with typed input schema and session access */
export type AiTool<TInput extends z.ZodRawShape | undefined = undefined> = {
  name: string;
  description: string;
  inputSchema?: TInput;
  annotations?: ToolAnnotations;
  /** Whether this tool should be exposed via the MCP server (default: true) */
  mcpSupported?: boolean;
  isTool: true;
  handler: (
    args: TInput extends z.ZodRawShape ? z.objectOutputType<TInput, z.ZodTypeAny> : unknown,
    session: ToolSession,
  ) => Promise<ToolResult>;
};

/** Helper to create a tool with full type inference */
export const createTool = <TInput extends z.ZodRawShape | undefined = undefined>(
  tool: Omit<AiTool<TInput>, 'isTool'>,
) => {
  return {
    ...tool,
    mcpSupported: tool.mcpSupported ?? true,
    isTool: true as const,
  };
};

// Legacy type aliases for backward compatibility
export type McpSession = ToolSession;
export type McpToolResult = ToolResult;
export type McpTool<TInput extends z.ZodRawShape | undefined = undefined> = AiTool<TInput>;
