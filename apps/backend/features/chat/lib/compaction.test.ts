import type { ModelMessage } from 'ai';

import { CLEARED_RESULT_NOTE, CLEARED_TOOL_INPUT_NOTE, compactContext } from './compaction';

// A small ceiling keeps the fixtures small: trigger at 8k tokens, reclaim at least 1.5k, tail of 1k
const MAX_INPUT_TOKENS = 10_000;

// ---------- Fixtures ----------
const user = (text: string): ModelMessage => ({ role: 'user', content: [{ type: 'text', text }] });

/** An assistant step that thinks, then calls a tool */
const call = (toolCallId: string, toolName: string, input: unknown = {}): ModelMessage => ({
  role: 'assistant',
  content: [
    { type: 'reasoning', text: 'Let me check.' },
    { type: 'tool-call', toolCallId, toolName, input },
  ],
});

const result = (toolCallId: string, toolName: string, value: string): ModelMessage => ({
  role: 'tool',
  content: [{ type: 'tool-result', toolCallId, toolName, output: { type: 'text', value } }],
});

/** An assistant step that thinks, then answers */
const reply = (text: string): ModelMessage => ({
  role: 'assistant',
  content: [
    { type: 'reasoning', text: 'Thinking it over.' },
    { type: 'text', text },
  ],
});

/** Two finished turns: an old large read (clearable) and a recent large run-code result */
const thread = (): ModelMessage[] => [
  user('Load the data'),
  call('c1', 'read-file', { path: '/data.csv' }),
  result('c1', 'read-file', 'r'.repeat(10_000)),
  reply('Loaded.'),
  user('Switch org and analyze it'),
  call('c2', 'switch-organization', { organizationId: 'org_2' }),
  result('c2', 'switch-organization', 'Switched to Org 2'),
  call('c3', 'run-code', { code: 'analyze()' }),
  result('c3', 'run-code', 'o'.repeat(3000)),
  reply('Done.'),
  user('What did you find?'),
];

/** The text of a message's first tool result */
const resultValue = (message: ModelMessage | undefined) => {
  const part = message?.role === 'tool' ? message.content[0] : undefined;
  return part?.type === 'tool-result' && part.output.type === 'text'
    ? part.output.value
    : undefined;
};

/** The part types of an assistant message */
const partTypes = (message: ModelMessage | undefined) =>
  message?.role === 'assistant' && Array.isArray(message.content)
    ? message.content.map((part) => part.type)
    : [];

/** Compacts with the small ceiling */
const compact = (options: Omit<Parameters<typeof compactContext>[0], 'maxInputTokens'>) =>
  compactContext({ ...options, maxInputTokens: MAX_INPUT_TOKENS });

// ---------- Tests ----------
describe('compactContext', () => {
  it('leaves a thread under the trigger untouched', () => {
    const messages = thread();

    const compacted = compact({ messages, steps: [], compactedThrough: 0, contextTokens: 5000 });

    expect(compacted.messages).toEqual(messages);
    expect(compacted.compactedThrough).toBe(0);
    expect(compacted.savedTokens).toBe(0);
  });

  it('sweeps everything outside the protected tail once over the trigger', () => {
    const compacted = compact({
      messages: thread(),
      steps: [],
      compactedThrough: 0,
      contextTokens: 9000,
    });

    // The tail walks back from the end until it covers 1k tokens, which the run-code result does
    expect(compacted.compactedThrough).toBe(8);
    expect(compacted.savedTokens).toBeGreaterThan(1500);
    // The old read is cleared and its reasoning dropped
    expect(resultValue(compacted.messages[2])).toBe(CLEARED_RESULT_NOTE);
    expect(partTypes(compacted.messages[1])).toEqual(['tool-call']);
    expect(partTypes(compacted.messages[3])).toEqual(['text']);
    // A write result is kept, since its ids can't be re-fetched
    expect(resultValue(compacted.messages[6])).toBe('Switched to Org 2');
    // The tail is untouched, thinking included
    expect(resultValue(compacted.messages[8])).toBe('o'.repeat(3000));
    expect(partTypes(compacted.messages[9])).toEqual(['reasoning', 'text']);
  });

  it('never sweeps the live step, even when the tail budget is already used up', () => {
    const messages = [
      user('Load both files'),
      call('c1', 'read-file'),
      result('c1', 'read-file', 'a'.repeat(10_000)),
      call('c2', 'read-file'),
      result('c2', 'read-file', 'b'.repeat(10_000)),
    ];

    const compacted = compact({
      messages,
      steps: [{ usage: { inputTokens: 9000, outputTokens: 100 } }],
      compactedThrough: 0,
    });

    expect(compacted.compactedThrough).toBe(3);
    expect(resultValue(compacted.messages[2])).toBe(CLEARED_RESULT_NOTE);
    // The live step's thinking and its pending result go back as they were
    expect(compacted.messages[3]).toEqual(messages[3]);
    expect(compacted.messages[4]).toEqual(messages[4]);
  });

  it('does nothing when the sweep would reclaim less than the minimum', () => {
    // Only write results outside the tail, so all a sweep could drop is a little reasoning
    const messages = thread().map((message) =>
      message.role === 'tool' && resultValue(message)?.startsWith('r')
        ? result('c1', 'run-code', 'r'.repeat(10_000))
        : message,
    );

    const compacted = compact({ messages, steps: [], compactedThrough: 0, contextTokens: 9000 });

    expect(compacted.messages).toEqual(messages);
    expect(compacted.compactedThrough).toBe(0);
  });

  it('re-applies a stored boundary without reporting new savings', () => {
    const compacted = compact({
      messages: thread(),
      steps: [],
      compactedThrough: 8,
      contextTokens: 3000,
    });

    expect(resultValue(compacted.messages[2])).toBe(CLEARED_RESULT_NOTE);
    expect(compacted.compactedThrough).toBe(8);
    expect(compacted.savedTokens).toBe(0);
  });

  it('pulls a stored boundary back to the live step (e.g. after a retry shortened the thread)', () => {
    const compacted = compact({
      messages: thread(),
      steps: [],
      compactedThrough: 50,
      contextTokens: 3000,
    });

    expect(compacted.compactedThrough).toBe(9);
    expect(partTypes(compacted.messages[9])).toEqual(['reasoning', 'text']);
  });

  it("sizes against the last step's usage rather than the stored turn size", () => {
    const options = { messages: thread(), compactedThrough: 0 };

    const quiet = compact({
      ...options,
      steps: [{ usage: { inputTokens: 2000, outputTokens: 0 } }],
      contextTokens: 9000,
    });
    const loud = compact({
      ...options,
      steps: [{ usage: { inputTokens: 9000, outputTokens: 0 } }],
      contextTokens: 2000,
    });

    expect(quiet.savedTokens).toBe(0);
    expect(loud.savedTokens).toBeGreaterThan(0);
  });

  it('blanks tool arguments large enough to be a payload', () => {
    const messages = [
      user('Save this'),
      call('c1', 'write-file', { path: '/big.txt', content: 'x'.repeat(5000) }),
      result('c1', 'write-file', 'Saved'),
      call('c2', 'read-file', { path: '/big.txt' }),
      result('c2', 'read-file', 'x'.repeat(5000)),
      reply('Saved and checked.'),
      user('Thanks'),
    ];

    const compacted = compact({ messages, steps: [], compactedThrough: 0, contextTokens: 9000 });

    const swept = compacted.messages[1];
    const toolCall =
      swept?.role === 'assistant' && Array.isArray(swept.content) ? swept.content[0] : undefined;
    expect(toolCall).toMatchObject({ type: 'tool-call', input: { note: CLEARED_TOOL_INPUT_NOTE } });
  });

  it('is idempotent', () => {
    const first = compact({
      messages: thread(),
      steps: [],
      compactedThrough: 0,
      contextTokens: 9000,
    });
    const second = compact({
      messages: first.messages,
      steps: [],
      compactedThrough: first.compactedThrough,
      contextTokens: 9000,
    });

    expect(second.messages).toEqual(first.messages);
    expect(second.compactedThrough).toBe(first.compactedThrough);
  });
});
