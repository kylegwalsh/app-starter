import type { chatSchema } from '@repo/schemas';
import type { UIMessage } from 'ai';
import type { z } from 'zod';

// ---------- Types ----------

/** A chat message with our typed metadata (traceId, feedback, cancelled) */
export type ChatMessage = UIMessage<
  z.infer<typeof chatSchema.messageMetadata>,
  { 'conversation-title': z.infer<(typeof chatSchema.dataParts)['conversation-title']> }
>;
export type ChatMessagePart = ChatMessage['parts'][number];
type TextPart = { type: 'text'; text: string };

// ---------- Part predicates ----------

export const isTextPart = (p: ChatMessagePart): p is TextPart => p.type === 'text';

/** Reasoning + tool parts ("steps") that we group into a single collapsible block. */
export const isProcessPart = (p: ChatMessagePart): boolean =>
  p.type === 'reasoning' || p.type === 'dynamic-tool' || p.type.startsWith('tool-');

/** True if a process part is mid-flight (tool not yet finished, reasoning not yet done). */
export const isProcessPartActive = (p: ChatMessagePart): boolean => {
  if (p.type === 'reasoning') {
    return (p as { state?: string }).state === 'streaming';
  }
  if (p.type === 'dynamic-tool' || p.type.startsWith('tool-')) {
    const state = (p as { state?: string }).state;
    return state === 'input-streaming' || state === 'input-available';
  }
  return false;
};

/** True if an assistant message has any visible output — hides empty shells from failed streams */
export const hasVisibleContent = (parts: readonly ChatMessagePart[]): boolean =>
  parts.some((p) => (isTextPart(p) && p.text.trim().length > 0) || isProcessPart(p));

// ---------- Text helpers ----------

/** Joins all text parts of a message into a single string for copying */
export const extractMessageText = (parts: readonly ChatMessagePart[]): string =>
  parts
    .filter((p) => isTextPart(p))
    .map((p) => p.text)
    .join('\n');

/** "list-organizations" → "List organizations" */
export const formatToolName = (name: string): string => {
  const spaced = name.replaceAll(/[-_]/g, ' ').trim();
  return spaced.length === 0 ? name : spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
