/**
 * Keeps a chat prompt under the model's ceiling by sweeping old tool results out of the view we
 * send (stored history is never modified). See `apps/web/app/(authenticated)/chat/README.md` for
 * why each threshold is what it is.
 */
import type {
  AssistantContent,
  LanguageModelUsage,
  ModelMessage,
  ToolCallPart,
  ToolContent,
  ToolResultPart,
} from 'ai';

// oxlint-disable-next-line no-namespace -- Namespace import used to read every registered tool's annotations
import * as allTools from '@/ai/tools';

/** Claude Sonnet 5.5's input ceiling */
export const MAX_INPUT_TOKENS = 1_000_000;
/** Share of the ceiling above which a sweep is considered */
const TRIGGER_SHARE = 0.8;
/** Least a sweep must reclaim (share of the ceiling) to be worth rewriting the prompt prefix */
const MIN_RECLAIM_SHARE = 0.15;
/** Share of the ceiling at the end of the thread that is never swept */
const PROTECTED_TAIL_SHARE = 0.1;
/** Tool arguments past this many characters are a payload, not a query */
const MAX_TOOL_INPUT_CHARS = 2 * 1024;
/** Tool-result JSON measures 2.2-2.4 chars per token; the low end reads high, so sweeps err early */
const CHARS_PER_TOKEN = 2.2;
/** What a provider charges for an image (priced by dimensions and capped), not its URL's length */
const IMAGE_TOKENS = 4784;

export const CLEARED_RESULT_NOTE = '[Result cleared to save context — re-run if needed]';
export const CLEARED_TOOL_INPUT_NOTE = '[Arguments cleared to save context]';

/** Only read-only results are cleared: they can be re-fetched, while write results carry created ids */
const READ_ONLY_TOOL_NAMES: ReadonlySet<string> = new Set(
  Object.values(allTools)
    .filter((tool) => tool.annotations?.readOnlyHint)
    .map((tool) => tool.name),
);

// ---------- SIZING ----------
/** Matched on the part's shape, never a field name (`data` is an ordinary key in result JSON) */
const isImagePart = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  'mediaType' in value &&
  typeof value.mediaType === 'string' &&
  value.mediaType.startsWith('image/');

/** Estimates messages' tokens from their serialized size, charging images a flat rate */
export const estimateTokens = (messages: ModelMessage[]) => {
  let images = 0;
  const serialized = JSON.stringify(messages, (_key, value: unknown) => {
    if (!isImagePart(value)) {
      return value;
    }
    images += 1;
    return { type: 'image' };
  });
  return serialized.length / CHARS_PER_TOKEN + images * IMAGE_TOKENS;
};

// ---------- SWEEPING ----------
/** Blanks a tool call's arguments once they're large enough to be the bulk of the call */
const sweptToolCall = (part: ToolCallPart): ToolCallPart =>
  JSON.stringify(part.input ?? null).length > MAX_TOOL_INPUT_CHARS
    ? { ...part, input: { note: CLEARED_TOOL_INPUT_NOTE } }
    : part;

/** Replaces a read-only tool's result with the note, leaving every other tool's alone */
const sweptToolResult = (part: ToolResultPart): ToolResultPart =>
  READ_ONLY_TOOL_NAMES.has(part.toolName)
    ? { ...part, output: { type: 'text', value: CLEARED_RESULT_NOTE } }
    : part;

/** Drops reasoning, then sweeps the message's tool calls and results */
const sweptAssistantContent = (content: AssistantContent): AssistantContent => {
  if (typeof content === 'string') {
    return content;
  }
  const withoutReasoning = content.filter((part) => part.type !== 'reasoning');
  // A message that was nothing but reasoning keeps it, since providers reject empty content
  const kept = withoutReasoning.length > 0 ? withoutReasoning : content;
  return kept.map((part) => {
    if (part.type === 'tool-call') {
      return sweptToolCall(part);
    }
    return part.type === 'tool-result' ? sweptToolResult(part) : part;
  });
};

const sweptToolContent = (content: ToolContent): ToolContent =>
  content.map((part) => (part.type === 'tool-result' ? sweptToolResult(part) : part));

/** Sweeps one message (idempotent: a swept message sweeps to itself) */
const sweptMessage = (message: ModelMessage): ModelMessage => {
  if (message.role === 'assistant') {
    return { ...message, content: sweptAssistantContent(message.content) };
  }
  return message.role === 'tool'
    ? { ...message, content: sweptToolContent(message.content) }
    : message;
};

/** Sweeps the messages before the boundary and leaves the rest untouched */
const sweepThrough = (messages: ModelMessage[], boundary: number) =>
  messages.map((message, index) => (index < boundary ? sweptMessage(message) : message));

// ---------- PROTECTED TAIL ----------
/** Where the live step starts (the last assistant message); never swept, since Anthropic requires its
 *  thinking echoed back while its tool calls are pending. Also where the measured prompt ends. */
const liveStepStart = (messages: ModelMessage[]) => {
  const index = messages.findLastIndex((message) => message.role === 'assistant');
  return index === -1 ? messages.length : index;
};

/** Where the protected tail starts: the live step, or further back until the tail's share of the
 *  ceiling is used up. Measured in tokens, not turns, since one turn can be the whole thread. */
const protectedTailStart = (messages: ModelMessage[], maxInputTokens: number, liveStep: number) => {
  const budget = maxInputTokens * PROTECTED_TAIL_SHARE;
  let start = messages.length;
  let tailTokens = 0;
  while (start > 0 && tailTokens < budget) {
    start -= 1;
    tailTokens += estimateTokens([messages[start]]);
  }
  return Math.min(start, liveStep);
};

// ---------- ENTRY POINT ----------
/**
 * Compacts the prompt for the next step: outside the protected tail, reasoning is dropped, read-only
 * tool results are replaced with a note, and oversized tool arguments are blanked.
 *
 * Runs before every step, since one step can append many tool results. All or nothing: the whole
 * sweep is priced first and only happens if it reclaims enough to be worth rewriting the prompt
 * prefix. `compactedThrough` only advances when a sweep happens; storing it keeps the prefix
 * byte-identical between sweeps.
 */
export const compactContext = ({
  messages,
  steps,
  compactedThrough,
  contextTokens,
  maxInputTokens = MAX_INPUT_TOKENS,
}: {
  messages: ModelMessage[];
  /** The turn's finished steps (the last one's usage measures the prompt) */
  steps: ReadonlyArray<{ usage: Pick<LanguageModelUsage, 'inputTokens' | 'outputTokens'> }>;
  /** The stored boundary: messages before it have already been swept */
  compactedThrough: number;
  /** The measured size of the thread after the last turn, which sizes the first step */
  contextTokens?: number | null;
  maxInputTokens?: number;
}) => {
  const liveStep = liveStepStart(messages);
  // The live step wins over a stored boundary (a retry can leave the boundary past it)
  const boundary = Math.min(compactedThrough, liveStep);
  const swept = sweepThrough(messages, boundary);
  // Re-applying the stored boundary reclaims nothing new
  const unchanged = { messages: swept, compactedThrough: boundary, savedTokens: 0 };

  // Size against the provider's count of the last request, plus an estimate of what's been
  // appended since (nothing has measured it yet). With no measurement, estimate it all, which
  // reads low since it can't see the system prompt or tool definitions.
  const usage = steps.at(-1)?.usage;
  const measured =
    usage?.inputTokens == null
      ? (contextTokens ?? undefined)
      : usage.inputTokens + (usage.outputTokens ?? 0);
  const projected =
    measured === undefined
      ? estimateTokens(swept)
      : measured + estimateTokens(swept.slice(liveStep + 1));
  if (projected <= maxInputTokens * TRIGGER_SHARE) {
    return unchanged;
  }

  // Nothing outside the tail that an earlier sweep hasn't already cleared
  const tailStart = protectedTailStart(messages, maxInputTokens, liveStep);
  if (tailStart <= boundary) {
    return unchanged;
  }
  // Price the whole sweep before committing to it
  const fullySwept = sweepThrough(messages, tailStart);
  const savedTokens = estimateTokens(swept) - estimateTokens(fullySwept);
  if (savedTokens < maxInputTokens * MIN_RECLAIM_SHARE) {
    return unchanged;
  }
  return { messages: fullySwept, compactedThrough: tailStart, savedTokens };
};
