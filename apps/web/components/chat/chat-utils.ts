import { useChatContext } from './chat-provider';

// ---------- Types ----------

export type ChatMessage = ReturnType<typeof useChatContext>['messages'][number];
export type ChatMessagePart = ChatMessage['parts'][number];
type TextPart = { type: 'text'; text: string };

export type FeedbackHandler = (messageId: string, rating: 'up' | 'down', comment?: string) => void;

// ---------- Part predicates ----------

export const isTextPart = (p: ChatMessagePart): p is TextPart => p.type === 'text';

export const isUserOrAssistant = (
  m: ChatMessage,
): m is ChatMessage & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant';

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

/** "tell-me-a-joke" → "Tell me a joke" */
export const formatToolName = (name: string): string => {
  const spaced = name.replaceAll(/[-_]/g, ' ').trim();
  return spaced.length === 0 ? name : spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
