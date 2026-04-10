import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { Organization } from '@prisma/client';
import type { z } from 'zod';

import type { AuthUser } from '@/core';

/** The session that every tool invocation receives */
export type ToolSession = {
  /** Session identifier (e.g. MCP transport session ID) */
  id?: string;
  /** Authenticated user */
  user: AuthUser;
  /** Active organization */
  organization: Organization;
  /** Chat conversation ID (only present in chat context) */
  conversationId?: string;
};

/** Definition for a tool with typed input schema and session access */
export type AiTool<TInput extends z.ZodRawShape = z.ZodRawShape> = {
  /** The name of the tool */
  name: string;
  /** The description of the tool */
  description: string;
  /** The input schema of the tool */
  inputSchema?: TInput;
  /** Hints for agents to better understand the tool */
  annotations?: ToolAnnotations;
  /** Whether this tool should be exposed via the MCP server (default: true) */
  mcpSupported?: boolean;
  /** Whether this tool should be available in chat (default: true) */
  chatSupported?: boolean;
  /** Whether this is a tool (to avoid registering any non-tool exports) */
  isTool: true;
  /** Handler returns a string on success, throws on error. Format conversion is handled at the boundary. */
  handler: (
    args: TInput extends z.ZodRawShape ? z.objectOutputType<TInput, z.ZodTypeAny> : unknown,
    session: ToolSession,
  ) => Promise<string>;
};

/** Helper to create a tool with full type inference */
export const createTool = <TInput extends z.ZodRawShape = z.ZodRawShape>(
  tool: Omit<AiTool<TInput>, 'isTool'>,
) => {
  return {
    ...tool,
    mcpSupported: tool.mcpSupported ?? true,
    chatSupported: tool.chatSupported ?? true,
    isTool: true as const,
  };
};
