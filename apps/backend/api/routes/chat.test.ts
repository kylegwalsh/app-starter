import { db } from '@/db';
import { routerFactory } from '@/tests/factories';
import { userFactory } from '@/tests/factories/user-factory';
import { fakeStreamResult, mockAi } from '@/tests/mocks/ai';

/** Build a minimal UIMessage we can send through chat.send's input schema. */
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

// ---------- Tests ----------
describe('Chat Router', () => {
  let api: Awaited<ReturnType<typeof routerFactory.createRouter>>['router'];
  let user: Awaited<ReturnType<typeof routerFactory.createRouter>>['user'];
  let organization: Awaited<ReturnType<typeof routerFactory.createRouter>>['organization'];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default mocks: stream completes cleanly, title generation succeeds.
    mockAi.streamText.mockResolvedValue(fakeStreamResult());
    mockAi.generateObject.mockResolvedValue({ object: { title: 'Generated title' } });
    const mock = await routerFactory.createRouter();
    api = mock.router;
    user = mock.user;
    organization = mock.organization;
  });

  describe('send', () => {
    it('creates a conversation when no id is provided', async () => {
      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      await consume(res);

      const conversations = await db.conversation.findMany({ where: { userId: user.id } });
      expect(conversations).toHaveLength(1);
    });

    it('upserts an existing optimistic id from the client', async () => {
      const res = await api.chat.$post({
        json: {
          id: 'optimistic-cuid',
          messages: [userMessage('m1', 'Hello')],
        },
      });
      await consume(res);

      const conv = await db.conversation.findUnique({ where: { id: 'optimistic-cuid' } });
      expect(conv).not.toBeNull();
      expect(conv?.userId).toBe(user.id);
    });

    it('throws NOT_FOUND when the conversation belongs to another user', async () => {
      const otherUser = await userFactory.createUser();
      const conv = await db.conversation.create({
        data: { id: 'foreign-id', userId: otherUser.id, organizationId: organization.id },
      });

      // Ownership is checked before the stream begins, so this is a real HTTP status.
      const res = await api.chat.$post({
        json: {
          id: conv.id,
          messages: [userMessage('m1', 'hi')],
        },
      });
      expect(res.status).toBe(404);
    });

    it('persists user messages before the model is invoked', async () => {
      // The mock runs the assertion at the moment `streamText` is called — by
      // then, the user message must already be in the DB so a reload during
      // generation sees it.
      mockAi.streamText.mockImplementationOnce(async () => {
        const userMessages = await db.message.findMany({ where: { role: 'user' } });
        expect(userMessages).toHaveLength(1);
        expect(userMessages[0]?.id).toBe('m1');
        return fakeStreamResult();
      });

      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      await consume(res);
    });

    it('claims the generation lock by setting generatingUntil', async () => {
      let lockSnapshot: Date | null = null;
      mockAi.streamText.mockImplementationOnce(async () => {
        const conv = await db.conversation.findFirst({ where: { userId: user.id } });
        lockSnapshot = conv?.generatingUntil ?? null;
        return fakeStreamResult();
      });

      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      await consume(res);

      expect(lockSnapshot).not.toBeNull();
      // Lock should expire some time in the (near) future.
      expect(lockSnapshot!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it('clears the lock after the stream completes successfully', async () => {
      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      await consume(res);

      const conv = await db.conversation.findFirst({ where: { userId: user.id } });
      expect(conv?.generatingUntil).toBeNull();
    });

    it('clears the lock even when the stream throws', async () => {
      mockAi.streamText.mockRejectedValueOnce(new Error('boom'));

      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      const chunks = await consume(res);
      expect(chunks.some((c) => c.type === 'error' && String(c.errorText).includes('boom'))).toBe(
        true,
      );

      const conv = await db.conversation.findFirst({ where: { userId: user.id } });
      expect(conv?.generatingUntil).toBeNull();
    });

    it('persists an errored marker when the stream throws before persistence', async () => {
      // Reload of an errored conversation needs to surface "something went
      // wrong" inline — that requires an assistant row with `errored: true`.
      mockAi.streamText.mockRejectedValueOnce(new Error('boom'));

      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      const chunks = await consume(res);
      expect(chunks.some((c) => c.type === 'error' && String(c.errorText).includes('boom'))).toBe(
        true,
      );

      const conv = await db.conversation.findFirst({ where: { userId: user.id } });
      const assistantMessages = await db.message.findMany({
        where: { conversationId: conv!.id, role: 'assistant' },
      });
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0]?.errored).toBe(true);
      expect(assistantMessages[0]?.parts).toEqual([]);
    });

    it('does not write an errored marker on top of a cancellation marker', async () => {
      // When `chat.cancel` clears the lock mid-stream it also writes its own
      // marker. The handler's `finally` must not pile an errored row on top.
      let conversationId: string | undefined;
      mockAi.streamText.mockImplementationOnce(() => ({
        toUIMessageStream: () =>
          new ReadableStream({
            async start(controller) {
              controller.enqueue({ type: 'start' });
              const conv = await db.conversation.findFirst({ where: { userId: user.id } });
              conversationId = conv?.id;
              // Mimic chat.cancel landing while we're still streaming.
              await db.conversation.update({
                where: { id: conv!.id },
                data: { generatingUntil: null },
              });
              await db.message.create({
                data: { conversationId: conv!.id, role: 'assistant', parts: [], cancelled: true },
              });
              controller.enqueue({ type: 'finish' });
              controller.close();
            },
          }),
      }));

      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      await consume(res);

      const assistantMessages = await db.message.findMany({
        where: { conversationId, role: 'assistant' },
      });
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0]?.cancelled).toBe(true);
      expect(assistantMessages[0]?.errored).toBeFalsy();
    });

    it('throws CONFLICT when another producer is actively generating', async () => {
      const conv = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          // Lock that expires comfortably in the future.
          generatingUntil: new Date(Date.now() + 60_000),
        },
      });

      // The lock is claimed before the stream begins, so this is a real HTTP status.
      const res = await api.chat.$post({
        json: {
          id: conv.id,
          messages: [userMessage('m1', 'Hello')],
        },
      });
      expect(res.status).toBe(409);

      // Original lock must be untouched.
      const after = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(after?.generatingUntil).toEqual(conv.generatingUntil);
    });

    it('can re-claim a stale (TTL-expired) lock', async () => {
      const conv = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          generatingUntil: new Date(Date.now() - 60_000), // long expired
        },
      });

      const res = await api.chat.$post({
        json: {
          id: conv.id,
          messages: [userMessage('m1', 'Hello')],
        },
      });
      await consume(res);

      const after = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(after?.generatingUntil).toBeNull();
    });

    it('uses the user message as the title when AI title generation fails', async () => {
      mockAi.generateObject.mockRejectedValueOnce(new Error('model unavailable'));

      const res = await api.chat.$post({
        json: { messages: [userMessage('m1', 'Hello world')] },
      });
      await consume(res);

      const conv = await db.conversation.findFirst({ where: { userId: user.id } });
      expect(conv?.title).toBe('Hello world');
    });

    it('truncates a long fallback title at 60 chars with an ellipsis', async () => {
      mockAi.generateObject.mockRejectedValueOnce(new Error('boom'));

      const longText = 'a'.repeat(100);
      const res = await api.chat.$post({ json: { messages: [userMessage('m1', longText)] } });
      await consume(res);

      const conv = await db.conversation.findFirst({ where: { userId: user.id } });
      expect(conv?.title).toMatch(/…$/);
      // 60 'a's + ellipsis = 61 visible chars (ellipsis is one char).
      expect(conv?.title?.length).toBe(61);
    });

    it('seeds the title at creation so a stream failure still leaves a titled row', async () => {
      // Earlier behavior: streamText throwing before the title IIFE landed
      // left the conversation row with a null title, which the sidebar
      // rendered as a permanent skeleton. Both AI calls fail here to prove
      // the seed (written during creation) is the fallback — not the IIFE's
      // own catch block.
      mockAi.streamText.mockRejectedValueOnce(new Error('boom'));
      mockAi.generateObject.mockRejectedValueOnce(new Error('title boom'));

      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello world')] } });
      const chunks = await consume(res);
      expect(chunks.some((c) => c.type === 'error' && String(c.errorText).includes('boom'))).toBe(
        true,
      );

      const conv = await db.conversation.findFirst({ where: { userId: user.id } });
      expect(conv?.title).toBe('Hello world');
    });

    it('seeds "New chat" when the first user message has no text part', async () => {
      // File-only first message — no text to seed from, so the placeholder
      // stands in. The AI title IIFE is skipped (no seed to prompt with).
      const res = await api.chat.$post({
        json: {
          messages: [
            {
              id: 'm1',
              role: 'user',
              parts: [
                {
                  type: 'file' as const,
                  url: 'https://example.com/x.pdf',
                  mediaType: 'application/pdf',
                },
              ],
            },
          ],
        },
      });
      await consume(res);

      const conv = await db.conversation.findFirst({ where: { userId: user.id } });
      expect(conv?.title).toBe('New chat');
      expect(mockAi.generateObject).not.toHaveBeenCalled();
    });

    it('does not re-generate an AI title on a follow-up send to an existing conversation', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id, title: 'Existing title' },
      });

      const res = await api.chat.$post({
        json: {
          id: conv.id,
          messages: [userMessage('m1', 'Follow-up')],
        },
      });
      await consume(res);

      expect(mockAi.generateObject).not.toHaveBeenCalled();
      const after = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(after?.title).toBe('Existing title');
    });

    it('deduplicates user messages by id (regenerate-style retries)', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id },
      });
      // Same id as the message we'll re-send.
      await db.message.create({
        data: {
          id: 'm1',
          conversationId: conv.id,
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      });

      const res = await api.chat.$post({
        json: {
          id: conv.id,
          messages: [userMessage('m1', 'Hello')],
        },
      });
      await consume(res);

      const userMessages = await db.message.findMany({
        where: { conversationId: conv.id, role: 'user' },
      });
      expect(userMessages).toHaveLength(1);
    });

    it('skips persisting the assistant message when the lock is cleared mid-stream', async () => {
      // While streamText is running, simulate a concurrent `chat.cancel` by
      // clearing `generatingUntil` from the DB. The handler's onFinish should
      // see the missing lock and bail before writing the assistant message.
      let conversationId: string | undefined;
      mockAi.streamText.mockImplementationOnce(() => ({
        toUIMessageStream: () =>
          new ReadableStream({
            async start(controller) {
              controller.enqueue({ type: 'start' });
              // Clear the lock externally to mimic a cancel call landing
              // while the producer is still generating.
              const conv = await db.conversation.findFirst({ where: { userId: user.id } });
              conversationId = conv?.id;
              await db.conversation.update({
                where: { id: conv!.id },
                data: { generatingUntil: null },
              });
              controller.enqueue({ type: 'finish' });
              controller.close();
            },
          }),
      }));

      const res = await api.chat.$post({ json: { messages: [userMessage('m1', 'Hello')] } });
      await consume(res);

      const assistantMessages = await db.message.findMany({
        where: { conversationId, role: 'assistant' },
      });
      expect(assistantMessages).toHaveLength(0);
    });
  });

  describe('cancel', () => {
    it('clears the lock and persists a cancellation marker as an assistant message', async () => {
      const conv = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          generatingUntil: new Date(Date.now() + 30_000),
        },
      });

      const res = await api.chat.conversations[':id'].cancel.$post({
        param: { id: conv.id },
        json: {},
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ cancelled: true });

      const refreshed = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(refreshed?.generatingUntil).toBeNull();

      const assistantMessages = await db.message.findMany({
        where: { conversationId: conv.id, role: 'assistant' },
      });
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0]?.cancelled).toBe(true);
      expect(assistantMessages[0]?.parts).toEqual([]);
    });

    it('persists the supplied partial assistant message alongside the cancelled flag', async () => {
      const conv = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          generatingUntil: new Date(Date.now() + 30_000),
        },
      });

      await api.chat.conversations[':id'].cancel.$post({
        param: { id: conv.id },
        json: {
          partial: {
            id: 'partial-msg-id',
            parts: [{ type: 'text', text: 'Half of what I was about to say…' }],
          },
        },
      });

      const assistantMessages = await db.message.findMany({
        where: { conversationId: conv.id, role: 'assistant' },
      });
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0]?.id).toBe('partial-msg-id');
      expect(assistantMessages[0]?.cancelled).toBe(true);
      expect(assistantMessages[0]?.parts).toEqual([
        { type: 'text', text: 'Half of what I was about to say…' },
      ]);
    });

    it('returns { cancelled: false } and writes no marker when generation already finished', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id, generatingUntil: null },
      });

      const res = await api.chat.conversations[':id'].cancel.$post({
        param: { id: conv.id },
        json: {},
      });
      expect(await res.json()).toEqual({ cancelled: false });

      const assistantMessages = await db.message.findMany({
        where: { conversationId: conv.id, role: 'assistant' },
      });
      expect(assistantMessages).toHaveLength(0);
    });

    it('throws NOT_FOUND for an unowned conversation', async () => {
      const otherUser = await userFactory.createUser();
      const conv = await db.conversation.create({
        data: {
          userId: otherUser.id,
          organizationId: organization.id,
          generatingUntil: new Date(Date.now() + 30_000),
        },
      });

      const res = await api.chat.conversations[':id'].cancel.$post({
        param: { id: conv.id },
        json: {},
      });
      expect(res.status).toBe(404);
    });
  });

  describe('reconnect', () => {
    it('throws NOT_FOUND for an unowned conversation', async () => {
      const otherUser = await userFactory.createUser();
      const conv = await db.conversation.create({
        data: { userId: otherUser.id, organizationId: organization.id },
      });

      // Ownership is checked before the stream begins, so this is a real HTTP status.
      const res = await api.chat.conversations[':id'].reconnect.$post({ param: { id: conv.id } });
      expect(res.status).toBe(404);
    });

    it('replays the latest assistant message when the conversation is not locked', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id, generatingUntil: null },
      });
      await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello, world!' }],
        },
      });

      const res = await api.chat.conversations[':id'].reconnect.$post({ param: { id: conv.id } });
      const events = (await consume(res)) as Array<{
        type?: string;
        delta?: string;
      }>;
      const textDeltas = events.filter((e) => e.type === 'text-delta');
      expect(textDeltas.some((e) => e.delta === 'Hello, world!')).toBe(true);
    });

    it('emits an error chunk when no assistant message exists for the conversation', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id, generatingUntil: null },
      });
      // Only a user message — the producer never persisted a reply.
      await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'user',
          parts: [{ type: 'text', text: 'Hi' }],
        },
      });

      const res = await api.chat.conversations[':id'].reconnect.$post({ param: { id: conv.id } });
      const events = (await consume(res)) as Array<{
        type?: string;
        errorText?: string;
      }>;
      const errorChunk = events.find((e) => e.type === 'error');
      expect(errorChunk).toBeDefined();
      expect(errorChunk?.errorText).toMatch(/interrupted/i);
    });

    it('clears an expired lock on cleanup', async () => {
      const conv = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          generatingUntil: new Date(Date.now() - 60_000), // already expired
        },
      });
      await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'assistant',
          parts: [{ type: 'text', text: 'hi' }],
        },
      });

      const res = await api.chat.conversations[':id'].reconnect.$post({ param: { id: conv.id } });
      await consume(res);

      const after = await db.conversation.findUnique({ where: { id: conv.id } });
      expect(after?.generatingUntil).toBeNull();
    });

    it('replays tool parts with input + output chunks', async () => {
      const conv = await db.conversation.create({
        data: { userId: user.id, organizationId: organization.id },
      });
      await db.message.create({
        data: {
          conversationId: conv.id,
          role: 'assistant',
          parts: [
            {
              type: 'tool-runCode',
              toolCallId: 'call_1',
              state: 'output-available',
              input: { code: 'print(1)' },
              output: { stdout: '1\n' },
            },
          ],
        },
      });

      const res = await api.chat.conversations[':id'].reconnect.$post({ param: { id: conv.id } });
      const events = (await consume(res)) as Array<{
        type?: string;
        toolCallId?: string;
        toolName?: string;
      }>;
      expect(
        events.some((e) => e.type === 'tool-input-available' && e.toolCallId === 'call_1'),
      ).toBe(true);
      expect(
        events.some((e) => e.type === 'tool-output-available' && e.toolCallId === 'call_1'),
      ).toBe(true);
    });
  });

  describe('get', () => {
    it('returns the conversation with its title, messages, and lock state', async () => {
      const lockTime = new Date(Date.now() + 30_000);
      const conv = await db.conversation.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          title: 'A saved chat',
          generatingUntil: lockTime,
        },
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
      // JSON transport serializes dates to ISO strings.
      expect(result.generatingUntil).toEqual(lockTime.toISOString());
      const messages: Array<{ id: string; role: string }> = result.messages;
      expect(messages).toHaveLength(2);
      expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
      expect(messages.map((m) => m.id)).toEqual(['u1', 'a1']);
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
