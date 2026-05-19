import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { Organization } from '@prisma/client';
import { log } from '@repo/logs';
import type { z } from 'zod';

import { handleError } from '@/api/error';
import type { AuthUser } from '@/core';

/** The surfaces a tool can be invoked through */
export type ToolConsumer = 'chat' | 'mcp';

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
  /** Which surface invoked the tool — tools can branch behavior on this */
  consumer: ToolConsumer;
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
  /** The surfaces we should expose this tool on (some tools may only be useful in one context) */
  consumers: ToolConsumer[];
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
) => ({
  ...tool,
  isTool: true as const,
});

/** Result of running a tool — discriminated so adapters can format consistently. */
export type ToolRunResult = { ok: true; result: string } | { ok: false; message: string };

/**
 * Centralized tool invocation for every adapter (AI SDK chat + MCP). Logs the
 * start, success, and failure with `toolName` metadata, captures unexpected
 * errors via `handleError` (so 5xx hit analytics), and returns a discriminated
 * payload that each adapter formats into its native response shape.
 */
export const runTool = async ({
  tool,
  args,
  session,
}: {
  tool: Pick<AiTool, 'name' | 'handler'>;
  // oxlint-disable-next-line no-explicit-any: tool args are tool-specific; the adapter has already validated them
  args: any;
  session: ToolSession;
}): Promise<ToolRunResult> => {
  const start = Date.now();
  const context = { toolName: tool.name, consumer: session.consumer };
  log.info(context, `Running tool: ${tool.name}`);
  try {
    const result = await tool.handler(args, session);
    log.info({ ...context, durationMs: Date.now() - start }, 'Tool finished');
    return { ok: true, result };
  } catch (error) {
    await handleError({ error, properties: context });
    return { ok: false, message: error instanceof Error ? error.message : 'Tool execution failed' };
  }
};
