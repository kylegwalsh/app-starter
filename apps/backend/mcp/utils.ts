import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

/** The type representing an authenticated MCP session */
export type McpSession = {
  accessToken: string;
  userId?: string;
};

/** The result returned by an MCP tool handler */
export type McpToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

/** Definition for an MCP tool with typed input schema and session access */
export type McpTool<TInput extends z.ZodRawShape | undefined = undefined> = {
  name: string;
  description: string;
  inputSchema?: TInput;
  annotations?: ToolAnnotations;
  isTool: true;
  handler: (
    args: TInput extends z.ZodRawShape ? z.objectOutputType<TInput, z.ZodTypeAny> : unknown,
    session: McpSession,
  ) => Promise<McpToolResult>;
};

/** Helper to create a tool with full type inference */
export const createTool = <TInput extends z.ZodRawShape | undefined = undefined>(
  tool: Omit<McpTool<TInput>, 'isTool'>,
) => {
  return {
    ...tool,
    isTool: true,
  };
};
