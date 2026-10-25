import type { UIMessageChunk } from 'ai';

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
  getTraceId: vi.fn().mockReturnValue('test-trace-id'),
  // Run observed functions directly (no Langfuse span in tests)
  observe: vi.fn((_name: string, fn: (...args: never[]) => unknown) => fn),
  scoreTrace: vi.fn(),
  flush: vi.fn(async () => {}),
  captureException: vi.fn(async () => {}),
}));
vi.mock('@repo/ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('@repo/ai')>();
  return { ...original, ai: mockAi };
});

/**
 * Stand-in for `streamText`'s result. The returned `toUIMessageStream` emits a
 * minimal valid chunk sequence (start → optional middle chunks → finish) so
 * `createUIMessageStream` flushes and closes cleanly.
 */
export const fakeStreamResult = (chunks: UIMessageChunk[] = []) => ({
  toUIMessageStream: () =>
    new ReadableStream<UIMessageChunk>({
      start(controller) {
        controller.enqueue({ type: 'start' });
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.enqueue({ type: 'finish' });
        controller.close();
      },
    }),
});

export { mockAi };
