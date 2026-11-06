import type { Observed, ObservedArgs } from '@repo/ai';
import { streamText } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

/**
 * The mock instance behind `@repo/ai`'s `ai` export. Mutate per-test via
 * `mockAi.streamText.mockResolvedValueOnce(...)` etc.
 *
 * `vi.hoisted` runs before any imports so the constant is available to the
 * `vi.mock` factory below (which itself gets hoisted to the top of the file).
 * Hoisted variables can't be `export`-ed inline — we re-export at the bottom.
 */
const mockAi = vi.hoisted(() => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
  // Run observed functions directly (no Langfuse span in tests)
  observe: vi.fn(
    (_config: unknown, fn: (args: Observed<ObservedArgs>) => unknown) => (args: ObservedArgs) =>
      fn({ ...args, observation: { traceId: 'test-trace-id', end: () => {} } }),
  ),
  scoreTrace: vi.fn(),
  flush: vi.fn(async () => {}),
  captureException: vi.fn(async () => {}),
}));
vi.mock('@repo/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@repo/ai')>();
  return { ...original, ai: mockAi };
});

const USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

/**
 * Makes `ai.streamText` run the real AI SDK against a mock model that replies with `text`, so
 * streaming, `onFinish` persistence and aborts behave as in production. `beforeFinish` runs
 * mid-reply (e.g. to simulate a cancel landing while the model is still generating). With
 * `toolCall`, the first step calls that tool and the next step replies. With `error`, the reply
 * fails partway through.
 */
export const mockChatModel = ({
  text = 'Hello!',
  beforeFinish,
  toolCall,
  error,
}: {
  text?: string;
  beforeFinish?: () => Promise<void>;
  toolCall?: { toolName: string; input: Record<string, unknown> };
  error?: Error;
} = {}) => {
  let step = 0;
  const model = new MockLanguageModelV4({
    doStream: async () => {
      step += 1;
      const callsTool = toolCall !== undefined && step === 1;
      return {
        stream: new ReadableStream({
          async start(controller) {
            controller.enqueue({ type: 'stream-start', warnings: [] });
            if (callsTool) {
              controller.enqueue({
                type: 'tool-call',
                toolCallId: 'call-1',
                toolName: toolCall.toolName,
                input: JSON.stringify(toolCall.input),
              });
            } else {
              controller.enqueue({ type: 'text-start', id: 'text-1' });
              controller.enqueue({ type: 'text-delta', id: 'text-1', delta: text });
              if (error) {
                controller.enqueue({ type: 'error', error });
                controller.close();
                return;
              }
              controller.enqueue({ type: 'text-end', id: 'text-1' });
            }
            await beforeFinish?.();
            controller.enqueue({
              type: 'finish',
              finishReason: callsTool
                ? { unified: 'tool-calls', raw: undefined }
                : { unified: 'stop', raw: undefined },
              usage: USAGE,
            });
            controller.close();
          },
        }),
      };
    },
  });
  mockAi.streamText.mockImplementation((options: Parameters<typeof streamText>[0]) =>
    streamText({ ...options, model }),
  );
  return model;
};

export { mockAi };
