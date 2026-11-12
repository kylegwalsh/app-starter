import { analytics } from '@repo/analytics';

import { db } from '@/db';
import type { sandboxManager } from '@/services/daytona';
import { type TestSession, sessionFactory } from '@/tests/factories';
import { userFactory } from '@/tests/factories/user-factory';
import { mockAi, mockChatModel } from '@/tests/mocks/ai';

import { CLEARED_RESULT_NOTE } from './lib/compaction';

// The code tools are offered, but never reach Daytona in tests
const mockSandboxManager = vi.hoisted(() => ({
  isEnabled: true,
  getOrCreate: vi.fn<(typeof sandboxManager)['getOrCreate']>(),
}));
vi.mock('@/services/daytona', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/daytona')>();
  return { sandboxManager: { ...original.sandboxManager, ...mockSandboxManager } };
});

/** Build a user message in the shape the chat route accepts */
const userMessage = (id: string, text: string) => ({
  id,
  role: 'user' as const,
  parts: [{ type: 'text' as const, text }],
});

/** Drain an SSE `Response` (from `createUIMessageStreamResponse`) into an array of parsed chunks. */
const consume = async (res: Response): Promise<Array<Record<string, unknown>>> => {
  const chunks: Array<Record<string, unknown>> = [];
  if (!res.body) {
    return chunks;
  }
  const text = await new Response(res.body).text();
  for (const block of text.split('\n\n')) {
    const line = block.split('\n').find((l) => l.startsWith('data: '));
    if (!line) {
      continue;
    }
    const payload = line.slice(6).trim();
    if (!payload || payload === '[DONE]') {
      continue;
    }
    chunks.push(JSON.parse(payload));
  }
  return chunks;
};

type SendInput = {
  id: string;
  message: { id: string; role: 'user'; parts: Array<{ type: string; [key: string]: unknown }> };
};

// ---------- Tests ----------
describe('Chat Router', () => {
  let api: TestSession['api'];
  let user: TestSession['user'];
  let organization: TestSession['organization'];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default mocks: the model replies cleanly, title generation succeeds.
    mockChatModel();
    mockAi.generateText.mockResolvedValue({ output: { title: 'Generated title' } });
    const session = await sessionFactory.createSession();
    api = session.api;
    user = session.user;
    organization = session.organization;
  });

  /** Sends a message to a conversation and drains the streamed response */
  const send = async (
    conversationId: string,
    message: SendInput['message'] = userMessage('m1', 'Hello'),
  ) => {
    const res = await api.chat.$post({ json: { id: conversationId, message } });
    return { res, chunks: await consume(res) };
  };

  /** Creates a conversation owned by the signed-in user */
  const createConversation = (
    data: { title?: string; generatingUntil?: Date | null; contextTokens?: number } = {},
  ) =>
    db.conversation.create({ data: { userId: user.id, organizationId: organization.id, ...data } });

  /** Loads a conversation's messages in order */
  const getMessages = (conversationId: string) =>
    db.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });

  /** Reads a conversation's lock expiry */
  const getLock = async (conversationId: string) => {
    const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
    return conversation?.generatingUntil ?? null;
  };

  /** Lists the roles of a conversation's messages in order */
  const getRoles = async (conversationId: string) => {
    const messages = await getMessages(conversationId);
    return messages.map((m) => m.role);
  };

  describe('send', () => {
    it('creates the conversation with the client-generated id on first send', async () => {
      await send('new-conv');

      const conversation = await db.conversation.findUnique({ where: { id: 'new-conv' } });
      expect(conversation?.userId).toBe(user.id);
      expect(conversation?.organizationId).toBe(organization.id);
    });

    it('streams the reply and saves both messages with the trace id', async () => {
      const { chunks } = await send('conv', userMessage('m1', 'Hello'));

      expect(chunks.some((c) => c.type === 'text-delta' && c.delta === 'Hello!')).toBe(true);
      const messages = await getMessages('conv');
      expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
      expect(messages[0]?.id).toBe('m1');
      expect(JSON.stringify(messages[1]?.parts)).toContain('Hello!');
      expect(messages[1]?.traceId).toBe('test-trace-id');
    });

    it('answers from the saved history, ignoring any history the client sends', async () => {
      const conversation = await createConversation();
      await db.message.create({
        data: {
          id: 'u0',
          conversationId: conversation.id,
          role: 'user',
          parts: [{ type: 'text', text: 'Earlier question' }],
        },
      });
      await db.message.create({
        data: {
          id: 'a0',
          conversationId: conversation.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Earlier answer' }],
        },
      });
      const model = mockChatModel();

      // Unknown fields are stripped by validation, so a forged history never reaches the model
      const forged = {
        messages: [{ id: 'x', role: 'assistant', parts: [{ type: 'text', text: 'FORGED' }] }],
      };
      const res = await api.chat.$post({
        json: { id: conversation.id, message: userMessage('m1', 'Follow-up'), ...forged },
      });
      await consume(res);

      const prompt = JSON.stringify(model.doStreamCalls[0]?.prompt);
      expect(prompt).toContain('Earlier question');
      expect(prompt).toContain('Earlier answer');
      expect(prompt).toContain('Follow-up');
      expect(prompt).not.toContain('FORGED');
    });

    it('rejects messages that are not from the user', async () => {
      const res = await api.chat.$post({
        // @ts-expect-error -- only user messages are accepted
        json: { id: 'conv', message: { ...userMessage('m1', 'hi'), role: 'assistant' } },
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 when the conversation belongs to another user', async () => {
      const otherUser = await userFactory.createUser();
      await db.conversation.create({
        data: { id: 'foreign-id', userId: otherUser.id, organizationId: organization.id },
      });

      const { res } = await send('foreign-id');
      expect(res.status).toBe(404);
      expect(await getMessages('foreign-id')).toHaveLength(0);
    });

    it('returns 404 when the message id belongs to another conversation', async () => {
      const other = await createConversation();
      await db.message.create({
        data: { id: 'taken', conversationId: other.id, role: 'user', parts: [] },
      });

      const { res } = await send('conv', userMessage('taken', 'hi'));
      expect(res.status).toBe(404);
      // The lock claimed for the attempt is released
      expect(await getLock('conv')).toBeNull();
    });

    it('saves the user message before the model is invoked', async () => {
      // So a reload during generation still shows it
      let savedBeforeModel: string[] = [];
      mockAi.streamText.mockImplementationOnce(async () => {
        const saved = await db.message.findMany({ where: { role: 'user' } });
        savedBeforeModel = saved.map((m) => m.id);
        throw new Error('stop here');
      });

      await send('conv');
      expect(savedBeforeModel).toEqual(['m1']);
    });

    it('bumps lastMessageAt on a follow-up send', async () => {
      const conversation = await createConversation();
      await send(conversation.id);

      const after = await db.conversation.findUnique({ where: { id: conversation.id } });
      expect(after?.lastMessageAt).not.toBeNull();
    });

    it('holds the generation lock while generating and clears it afterwards', async () => {
      let lockDuringGeneration: Date | null = null;
      mockChatModel({
        beforeFinish: async () => {
          lockDuringGeneration = await getLock('conv');
        },
      });

      await send('conv');

      expect(lockDuringGeneration).not.toBeNull();
      expect(await getLock('conv')).toBeNull();
    });

    it('passes an abort signal so a cancel can stop the model', async () => {
      const model = mockChatModel();
      await send('conv');
      expect(model.doStreamCalls[0]?.abortSignal).toBeInstanceOf(AbortSignal);
    });

    it('streams an error for a failed turn, saves no reply, and clears the lock', async () => {
      mockAi.streamText.mockRejectedValueOnce(new Error('boom'));

      const { chunks } = await send('conv');

      const error = chunks.find((c) => c.type === 'error');
      expect(String(error?.errorText)).toContain('boom');
      // The conversation ends on the user's message, which the client offers to retry
      expect(await getRoles('conv')).toEqual(['user']);
      expect(await getLock('conv')).toBeNull();
    });

    it('saves the reply when a tool call fails and the model recovers', async () => {
      mockSandboxManager.getOrCreate.mockRejectedValueOnce(new Error('Sandbox unavailable'));
      const captureException = vi.spyOn(analytics, 'captureException');
      mockChatModel({
        toolCall: { toolName: 'run-code', input: { code: 'print(1)' } },
        text: 'The sandbox is down, so here is the answer from memory.',
      });

      const { chunks } = await send('conv');

      expect(chunks.some((c) => c.type === 'tool-output-error')).toBe(true);
      expect(await getRoles('conv')).toEqual(['user', 'assistant']);
      // The tool runner reports the failed call, but a recovered tool failure isn't a failed turn
      const turnReports = captureException.mock.calls.filter(
        ([, properties]) => properties && 'conversationId' in properties,
      );
      expect(turnReports).toHaveLength(0);
    });

    it('saves no reply when the model fails partway through', async () => {
      mockChatModel({ text: 'Half an ans', error: new Error('model overloaded') });

      const { chunks } = await send('conv');

      expect(String(chunks.find((c) => c.type === 'error')?.errorText)).toContain('overloaded');
      expect(await getRoles('conv')).toEqual(['user']);
      expect(await getLock('conv')).toBeNull();
    });

    it('retries a saved message by replacing the reply after it', async () => {
      await send('conv', userMessage('m1', 'Hello'));
      mockChatModel({ text: 'Second answer' });

      await send('conv', userMessage('m1', 'Hello'));

      const messages = await getMessages('conv');
      expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
      expect(JSON.stringify(messages[1]?.parts)).toContain('Second answer');
    });

    it('retries without touching earlier turns', async () => {
      await send('conv', userMessage('m1', 'First'));
      await send('conv', userMessage('m2', 'Second'));
      const [, firstReply] = await getMessages('conv');

      await send('conv', userMessage('m2', 'Second'));

      const messages = await getMessages('conv');
      expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
      expect(messages[0]?.id).toBe('m1');
      expect(messages[1]?.id).toBe(firstReply?.id);
      expect(messages[2]?.id).toBe('m2');
    });

    it('returns 409 when another producer is actively generating', async () => {
      const lock = new Date(Date.now() + 60_000);
      const conversation = await createConversation({ generatingUntil: lock });

      const { res } = await send(conversation.id);
      expect(res.status).toBe(409);

      // Nothing was saved and the original lock is untouched
      expect(await getMessages(conversation.id)).toHaveLength(0);
      expect(await getLock(conversation.id)).toEqual(lock);
    });

    it('can re-claim a stale (TTL-expired) lock', async () => {
      const conversation = await createConversation({
        generatingUntil: new Date(Date.now() - 60_000),
      });

      await send(conversation.id);

      expect(await getMessages(conversation.id)).toHaveLength(2);
    });

    it('keeps only the partial the user saw when they cancel mid-stream', async () => {
      mockChatModel({
        beforeFinish: async () => {
          await api.chat.conversations[':id'].cancel.$post({
            param: { id: 'conv' },
            json: { partial: { id: 'partial', parts: [{ type: 'text', text: 'Hel' }] } },
          });
        },
      });

      await send('conv');

      const [userMessageRow, reply, ...rest] = await getMessages('conv');
      expect(userMessageRow?.role).toBe('user');
      expect(reply?.id).toBe('partial');
      expect(reply?.cancelled).toBe(true);
      expect(rest).toHaveLength(0);
    });

    it('titles a new conversation with the AI title, streaming it to the client', async () => {
      const { chunks } = await send('conv', userMessage('m1', 'Hello world'));

      const conversation = await db.conversation.findUnique({ where: { id: 'conv' } });
      expect(conversation?.title).toBe('Generated title');
      // Sent as soon as it's ready, so the sidebar doesn't wait for the response to finish
      expect(chunks).toContainEqual({
        type: 'data-conversation-title',
        data: { title: 'Generated title' },
        transient: true,
      });
    });

    it('keeps the seeded title when AI title generation fails', async () => {
      mockAi.generateText.mockRejectedValueOnce(new Error('model unavailable'));

      await send('conv', userMessage('m1', 'Hello world'));

      const conversation = await db.conversation.findUnique({ where: { id: 'conv' } });
      expect(conversation?.title).toBe('Hello world');
    });

    it('truncates a long seeded title at 60 chars with an ellipsis', async () => {
      mockAi.generateText.mockRejectedValueOnce(new Error('boom'));

      await send('conv', userMessage('m1', 'a'.repeat(100)));

      const conversation = await db.conversation.findUnique({ where: { id: 'conv' } });
      expect(conversation?.title).toMatch(/…$/);
      // 60 'a's + ellipsis = 61 visible chars (ellipsis is one char).
      expect(conversation?.title?.length).toBe(61);
    });

    it('keeps the seeded title when the stream fails', async () => {
      mockAi.streamText.mockRejectedValueOnce(new Error('boom'));
      mockAi.generateText.mockRejectedValueOnce(new Error('title boom'));

      await send('conv', userMessage('m1', 'Hello world'));

      const conversation = await db.conversation.findUnique({ where: { id: 'conv' } });
      expect(conversation?.title).toBe('Hello world');
    });

    it('seeds "New chat" when the first message has no text', async () => {
      await send('conv', {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'file', url: 'https://example.com/x.pdf', mediaType: 'application/pdf' }],
      });

      const conversation = await db.conversation.findUnique({ where: { id: 'conv' } });
      expect(conversation?.title).toBe('New chat');
      expect(mockAi.generateText).not.toHaveBeenCalled();
    });

    it('compacts a thread near the ceiling and stores where it swept to', async () => {
      // The last turn measured 900k tokens. History: an old read the sweep can clear, then a recent
      // run-code result large enough to fill the protected tail.
      const conversation = await createConversation({ contextTokens: 900_000 });
      const history = [
        { role: 'user', parts: [{ type: 'text', text: 'Load the data' }] },
        {
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-read-file',
              toolCallId: 'c1',
              state: 'output-available',
              input: { path: '/data.csv' },
              output: 'r'.repeat(400_000),
            },
            { type: 'text', text: 'Loaded.' },
          ],
        },
        { role: 'user', parts: [{ type: 'text', text: 'Analyze it' }] },
        {
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-run-code',
              toolCallId: 'c2',
              state: 'output-available',
              input: { code: 'analyze()' },
              output: 'o'.repeat(250_000),
            },
            { type: 'text', text: 'Done.' },
          ],
        },
      ];
      for (const [index, message] of history.entries()) {
        // oxlint-disable-next-line no-await-in-loop -- Distinct timestamps keep the history ordered
        await db.message.create({
          data: {
            conversationId: conversation.id,
            ...message,
            createdAt: new Date(Date.now() - (history.length - index) * 1000),
          },
        });
      }

      const firstModel = mockChatModel();
      await send(conversation.id, userMessage('m1', 'Summarize'));

      // The old read was cleared from the prompt; the recent result in the tail was kept
      const firstPrompt = JSON.stringify(firstModel.doStreamCalls[0]?.prompt);
      expect(firstPrompt).not.toContain('r'.repeat(1000));
      expect(firstPrompt).toContain(CLEARED_RESULT_NOTE);
      expect(firstPrompt).toContain('o'.repeat(1000));
      // The boundary and the measured size (the mock model reports 1 input + 1 output token) are stored
      const afterFirst = await db.conversation.findUnique({ where: { id: conversation.id } });
      expect(afterFirst?.compactedThrough).toBeGreaterThan(0);
      expect(afterFirst?.contextTokens).toBe(2);
      // Stored history is never modified
      const stored = await getMessages(conversation.id);
      expect(JSON.stringify(stored[1]?.parts)).toContain('r'.repeat(1000));

      // The next turn is under the trigger, but re-applies the stored boundary so the prefix is stable
      const secondModel = mockChatModel();
      await send(conversation.id, userMessage('m2', 'Thanks'));
      const secondPrompt = JSON.stringify(secondModel.doStreamCalls[0]?.prompt);
      expect(secondPrompt).not.toContain('r'.repeat(1000));
      const afterSecond = await db.conversation.findUnique({ where: { id: conversation.id } });
      expect(afterSecond?.compactedThrough).toBe(afterFirst?.compactedThrough);
    });

    it('does not re-title an existing conversation on a follow-up send', async () => {
      const conversation = await createConversation({ title: 'Existing title' });

      const { chunks } = await send(conversation.id, userMessage('m1', 'Follow-up'));

      expect(mockAi.generateText).not.toHaveBeenCalled();
      expect(chunks.some((chunk) => chunk.type === 'data-conversation-title')).toBe(false);
      const after = await db.conversation.findUnique({ where: { id: conversation.id } });
      expect(after?.title).toBe('Existing title');
    });
  });

  describe('cancel', () => {
    it('clears the lock and saves an empty cancelled reply', async () => {
      const conversation = await createConversation({
        generatingUntil: new Date(Date.now() + 30_000),
      });

      const res = await api.chat.conversations[':id'].cancel.$post({
        param: { id: conversation.id },
        json: {},
      });
      expect(await res.json()).toEqual({ cancelled: true });

      expect(await getLock(conversation.id)).toBeNull();
      const messages = await getMessages(conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.cancelled).toBe(true);
      expect(messages[0]?.parts).toEqual([]);
    });

    it('saves the supplied partial reply as cancelled', async () => {
      const conversation = await createConversation({
        generatingUntil: new Date(Date.now() + 30_000),
      });

      await api.chat.conversations[':id'].cancel.$post({
        param: { id: conversation.id },
        json: {
          partial: { id: 'partial-msg-id', parts: [{ type: 'text', text: 'Half of it…' }] },
        },
      });

      const messages = await getMessages(conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.id).toBe('partial-msg-id');
      expect(messages[0]?.cancelled).toBe(true);
      expect(messages[0]?.parts).toEqual([{ type: 'text', text: 'Half of it…' }]);
    });

    it('replaces the full reply if it saved just before the lock cleared', async () => {
      const conversation = await createConversation({
        generatingUntil: new Date(Date.now() + 30_000),
      });
      await db.message.create({
        data: {
          id: 'reply-id',
          conversationId: conversation.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'The whole reply' }],
        },
      });

      const res = await api.chat.conversations[':id'].cancel.$post({
        param: { id: conversation.id },
        json: { partial: { id: 'reply-id', parts: [{ type: 'text', text: 'The whole' }] } },
      });
      expect(await res.json()).toEqual({ cancelled: true });

      const messages = await getMessages(conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.cancelled).toBe(true);
      expect(messages[0]?.parts).toEqual([{ type: 'text', text: 'The whole' }]);
    });

    it('returns { cancelled: false } and saves nothing when generation already finished', async () => {
      const conversation = await createConversation();

      const res = await api.chat.conversations[':id'].cancel.$post({
        param: { id: conversation.id },
        json: {},
      });
      expect(await res.json()).toEqual({ cancelled: false });
      expect(await getMessages(conversation.id)).toHaveLength(0);
    });

    it('returns 404 for an unowned conversation', async () => {
      const otherUser = await userFactory.createUser();
      const conversation = await db.conversation.create({
        data: {
          userId: otherUser.id,
          organizationId: organization.id,
          generatingUntil: new Date(Date.now() + 30_000),
        },
      });

      const res = await api.chat.conversations[':id'].cancel.$post({
        param: { id: conversation.id },
        json: {},
      });
      expect(res.status).toBe(404);
    });
  });

  describe('get', () => {
    it('returns the conversation with its title, messages, and generating state', async () => {
      const conv = await createConversation({
        title: 'A saved chat',
        generatingUntil: new Date(Date.now() + 30_000),
      });
      await db.message.createMany({
        data: [
          {
            id: 'u1',
            conversationId: conv.id,
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
          {
            id: 'a1',
            conversationId: conv.id,
            role: 'assistant',
            parts: [{ type: 'text', text: 'Hi there!' }],
          },
        ],
      });

      const res = await api.chat.conversations[':id'].$get({ param: { id: conv.id } });
      expect(res.status).toBe(200);
      const result = await res.json();

      expect(result.id).toBe(conv.id);
      expect(result.title).toBe('A saved chat');
      expect(result.isGenerating).toBe(true);
      const messages: Array<{ id: string; role: string }> = result.messages;
      expect(messages).toHaveLength(2);
      expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
      expect(messages.map((m) => m.id)).toEqual(['u1', 'a1']);
    });

    it('reports an expired lock (a producer that died) as not generating', async () => {
      const conv = await createConversation({ generatingUntil: new Date(Date.now() - 1000) });

      const res = await api.chat.conversations[':id'].$get({ param: { id: conv.id } });
      const result = await res.json();
      expect(result.isGenerating).toBe(false);
    });

    it('includes the cancelled flag in message metadata', async () => {
      const conv = await createConversation();
      await db.message.create({
        data: { id: 'a1', conversationId: conv.id, role: 'assistant', parts: [], cancelled: true },
      });

      const res = await api.chat.conversations[':id'].$get({ param: { id: conv.id } });
      const {
        messages: [message],
      } = await res.json();
      expect(message?.metadata.cancelled).toBe(true);
    });

    it('throws NOT_FOUND for a conversation that does not exist', async () => {
      const res = await api.chat.conversations[':id'].$get({ param: { id: 'nonexistent' } });
      expect(res.status).toBe(404);
    });
  });

  describe('list', () => {
    it('returns the current user/org conversations newest-first', async () => {
      const older = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          title: 'Older',
          lastMessageAt: new Date(Date.now() - 60_000),
        },
      });
      const newer = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          title: 'Newer',
          lastMessageAt: new Date(),
        },
      });

      const res = await api.chat.conversations.$get({ query: { limit: '20' } });
      const result = await res.json();
      expect(result.items.map((c) => c.id)).toEqual([newer.id, older.id]);
      expect(result.nextCursor).toBeUndefined();
    });

    it('does not include another user/org conversations', async () => {
      const otherUser = await userFactory.createUser();
      await db.conversation.create({
        data: { userId: otherUser.id, organizationId: organization.id, title: 'Theirs' },
      });
      await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id, title: 'Mine' },
      });

      const res = await api.chat.conversations.$get({ query: { limit: '20' } });
      const result = await res.json();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.title).toBe('Mine');
    });

    it('paginates with a cursor when more results are available', async () => {
      // Seed three conversations and request page size of 2.
      const convs = await Promise.all(
        ['a', 'b', 'c'].map((title, i) =>
          db.conversation.create({
            data: {
              userId: user.id,
              organizationId: organization.id,
              title,
              lastMessageAt: new Date(Date.now() - i * 1000),
            },
          }),
        ),
      );

      const page1Res = await api.chat.conversations.$get({ query: { limit: '2' } });
      const page1 = await page1Res.json();
      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).toBe(convs[1]?.id); // second-newest = b

      const page2Res = await api.chat.conversations.$get({
        query: { limit: '2', cursor: page1.nextCursor },
      });
      const page2 = await page2Res.json();
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0]?.id).toBe(convs[2]?.id); // oldest = c
      expect(page2.nextCursor).toBeUndefined();
    });
  });

  describe('updateTitle', () => {
    it('updates the title of an owned conversation', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id, title: 'Old' },
      });

      const res = await api.chat.conversations[':id'].$patch({
        param: { id: conv.id },
        json: { title: 'Renamed' },
      });
      expect(await res.json()).toEqual({ id: conv.id, title: 'Renamed' });

      const persisted = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(persisted?.title).toBe('Renamed');
    });

    it('throws NOT_FOUND for another user/org conversation', async () => {
      const otherUser = await userFactory.createUser();
      const conv = await db.conversation.create({
        data: { userId: otherUser.id, organizationId: organization.id, title: 'Theirs' },
      });

      const res = await api.chat.conversations[':id'].$patch({
        param: { id: conv.id },
        json: { title: 'Hijacked' },
      });
      expect(res.status).toBe(404);
    });

    it('rejects empty titles via input validation', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id, title: 'Old' },
      });

      const res = await api.chat.conversations[':id'].$patch({
        param: { id: conv.id },
        json: { title: '' },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('delete', () => {
    it('deletes an owned conversation and its messages', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id },
      });
      await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'user',
          parts: [{ type: 'text', text: 'Hi' }],
        },
      });

      const res = await api.chat.conversations[':id'].$delete({ param: { id: conv.id } });
      expect(await res.json()).toEqual({ success: true });

      const remaining = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(remaining).toBeNull();
      // Cascade should clear messages too.
      const messages = await db.message.findMany({ where: { conversationId: conv.id } });
      expect(messages).toHaveLength(0);
    });

    it('throws NOT_FOUND for a conversation owned by another user', async () => {
      const otherUser = await userFactory.createUser();
      const conv = await db.conversation.create({
        data: { userId: otherUser.id, organizationId: organization.id },
      });

      const res = await api.chat.conversations[':id'].$delete({ param: { id: conv.id } });
      expect(res.status).toBe(404);
      // Conversation must still be there.
      const stillThere = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(stillThere).not.toBeNull();
    });
  });

  describe('submitFeedback', () => {
    it('persists feedback on an owned assistant message', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id },
      });
      const message = await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Reply' }],
        },
      });

      const res = await api.chat.feedback.$post({
        json: { messageId: message.id, rating: 'up' },
      });
      expect(await res.json()).toEqual({ success: true });

      const updated = await db.message.findUnique({ where: { id: message.id } });
      expect(updated?.feedback).toBe(true);
    });

    it('forwards the score to Langfuse when the message has a traceId', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id },
      });
      const message = await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Reply' }],
          traceId: 'trace-xyz',
        },
      });

      await api.chat.feedback.$post({
        json: { messageId: message.id, rating: 'down', comment: 'meh' },
      });

      expect(mockAi.scoreTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'trace-xyz',
          name: 'user-feedback',
          score: false,
          comment: 'meh',
        }),
      );
    });

    it('skips Langfuse scoring when the message has no traceId', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id },
      });
      const message = await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Reply' }],
        },
      });

      await api.chat.feedback.$post({ json: { messageId: message.id, rating: 'up' } });
      expect(mockAi.scoreTrace).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the message belongs to another user', async () => {
      const otherUser = await userFactory.createUser();
      const otherConv = await db.conversation.create({
        data: { userId: otherUser.id, organizationId: organization.id },
      });
      const message = await db.message.create({
        data: {
          conversationId: otherConv.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Reply' }],
        },
      });

      const res = await api.chat.feedback.$post({ json: { messageId: message.id, rating: 'up' } });
      expect(res.status).toBe(404);
    });

    it('throws NOT_FOUND for a non-existent message', async () => {
      const res = await api.chat.feedback.$post({
        json: { messageId: 'no-such-id', rating: 'up' },
      });
      expect(res.status).toBe(404);
    });
  });
});
