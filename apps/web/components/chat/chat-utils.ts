import type { chatSchema } from '@repo/schemas';
import {
  type DynamicToolUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type ReasoningUIPart,
  type ToolUIPart,
  type UIMessage,
} from 'ai';
import type { z } from 'zod';

// ---------- Types ----------

/** A chat message with our typed metadata (traceId, feedback, cancelled) */
export type ChatMessage = UIMessage<
  z.infer<typeof chatSchema.messageMetadata>,
  { 'conversation-title': z.infer<(typeof chatSchema.dataParts)['conversation-title']> }
>;
export type ChatMessagePart = ChatMessage['parts'][number];

// ---------- Part predicates ----------

/** A reasoning or tool part */
export type ProcessPart = ReasoningUIPart | ToolUIPart | DynamicToolUIPart;

/** Reasoning + tool parts ("steps") that we group into a single collapsible block */
export const isProcessPart = (p: ChatMessagePart): p is ProcessPart =>
  isReasoningUIPart(p) || isToolUIPart(p);

/** True if a process part is mid-flight (tool not yet finished, reasoning not yet done) */
export const isProcessPartActive = (p: ProcessPart) => {
  if (p.type === 'reasoning') {
    return p.state === 'streaming';
  }
  return p.state === 'input-streaming' || p.state === 'input-available';
};

/** True if an assistant message has any visible output — hides empty shells from failed streams */
export const hasVisibleContent = (parts: readonly ChatMessagePart[]) =>
  parts.some((p) => (isTextUIPart(p) && p.text.trim().length > 0) || isProcessPart(p));

// ---------- Text helpers ----------

/** Joins all text parts of a message into a single string for copying */
export const extractMessageText = (parts: readonly ChatMessagePart[]) =>
  parts
    .filter((p) => isTextUIPart(p))
    .map((p) => p.text)
    .join('\n');

/** "list-organizations" → "List organizations" */
export const formatToolName = (name: string) => {
  const spaced = name.replaceAll(/[-_]/g, ' ').trim();
  return spaced.length === 0 ? name : spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
