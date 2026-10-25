import type { Prisma } from '@prisma/client';
import { ai, models, type Observed } from '@repo/ai';
import { log } from '@repo/logs';
import type { chatSchema } from '@repo/schemas';
import {
  type UIMessage,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  smoothStream,
  stepCountIs,
} from 'ai';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';

import { toAiSdkTools } from '@/ai/sdk';
import { db } from '@/db';
import { type AuthContext, sandboxManager } from '@/services';

import { downloadUploadsFromS3, sanitizeFileFilenames, signFileUrls } from './lib/attachments';
import { conversationLock } from './lib/lock';
import { streamFromMessage } from './lib/replay';
import { generateChatTitle, getTitleSeed, truncateTitle } from './lib/title';

/** Poll cadence used by {@link reconnectToGeneration} while waiting for the lock to clear. */
const RECONNECT_POLL_MS = 5000;

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to a persistent code execution environment.

When you need to analyze data, perform calculations, or generate visualizations:
- Use the run-code tool to execute Python code
- Use write-file to save data files for processing
- Use read-file to check outputs
- Use execute-command to install packages (e.g., pip install pandas matplotlib)

Files persist across messages in this conversation. You can build on previous work.
When generating charts, save them to /output/ (e.g., plt.savefig('/output/chart.png')).`;

// ---------- HELPERS ----------
/** Finds a conversation belonging to the signed-in user and organization, or throws a 404 */
const findOwnedConversation = async (id: string, { user, organization }: AuthContext) => {
  const conversation = await db.conversation.findFirst({
    where: { id, userId: user.id, organizationId: organization.id },
  });
  if (!conversation) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }
  return conversation;
};

// ---------- OPERATIONS ----------
/** Streams the assistant's response to a conversation (the replayable AI entry point for evals) */
export const streamChatTurn = ai.observe(
  {
    name: 'chat',
    // Stay open until the stream settles so the trace records the final response as its output
    endOnExit: false,
    sessionId: ({ input }) => input.conversationId,
  },
  async ({
    input: { conversationId, messages },
    context: { user, organization },
    observation,
  }: Observed<{
    input: {
      /** The conversation being answered (scopes the code sandbox and the trace session) */
      conversationId: string;
      /** The full conversation history, ending with the user's latest message */
      messages: UIMessage[];
    };
    context: AuthContext;
  }>) => {
    const modelMessages = await convertToModelMessages(sanitizeFileFilenames(messages), {
      // Drop any tool call left without a paired result from a cancelled run — without this
      // Claude rejects the request with "Tool results are missing for tool calls X, Y, Z".
      ignoreIncompleteToolCalls: true,
    });

    const result = await ai.streamText({
      model: models.bedrock['claude-sonnet-5-5'],
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      // Tools run in-process with access to the user's organization and conversation sandbox
      tools: toAiSdkTools({ user, organization, conversationId }),
      // Allow the model to take up to 10 steps (tool calls + responses)
      stopWhen: stepCountIs(10),
      // Let the model decide how much to reason (newer Claude models only support adaptive
      // thinking), keeping effort low for responsiveness and summarizing it for the UI
      providerOptions: {
        bedrock: {
          reasoningConfig: { type: 'adaptive', maxReasoningEffort: 'low', display: 'summarized' },
        },
      },
      // Read uploaded files straight from S3 (their stored URLs may have expired)
      experimental_download: downloadUploadsFromS3,
      // Smooth the token-by-token output into word-sized chunks with a small delay so the UI
      // renders typing-like text instead of jittery bursts
      experimental_transform: smoothStream({ delayInMs: 25, chunking: 'word' }),
      // End the observation once the stream settles
      onFinish: ({ text }) => observation.end({ output: text }),
      onError: ({ error }) => observation.end({ error }),
      onAbort: () => observation.end({ error: new Error('Stream aborted') }),
    });

    return { result, traceId: observation.traceId };
  },
);

/** Sends a message and streams back the AI response, creating the conversation on first send */
export const sendMessage = async (
  {
    conversationId,
    messages,
    isRetry,
  }: {
    /** The conversation to send to (created on first send with this ID) */
    conversationId?: string;
    /** The full conversation history, ending with the new user message */
    messages: UIMessage[];
    /** Whether this send retries a response that errored */
    isRetry?: boolean;
  },
  { user, organization }: AuthContext,
) => {
  const titleSeed = getTitleSeed(messages);

  // Look the row up first so we can tell whether this send creates the
  // conversation (the optimistic-ID pattern means the client navigates to
  // /chat/[id] before the row exists). Only the create path applies the
  // seeded title, and only the create path schedules AI title generation
  // later — so a follow-up send never re-titles an existing row.
  const existing = conversationId
    ? await db.conversation.findUnique({ where: { id: conversationId } })
    : null;
  if (existing && (existing.userId !== user.id || existing.organizationId !== organization.id)) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }
  const conversation =
    existing ??
    (await db.conversation.create({
      data: {
        ...(conversationId ? { id: conversationId } : {}),
        userId: user.id,
        organizationId: organization.id,
        lastMessageAt: new Date(),
        title: titleSeed ? truncateTitle(titleSeed) : 'New chat',
      },
    }));

  // Only one response generates at a time. If another tab/session holds the
  // lock, the client should reconnect to that stream instead.
  if (!(await conversationLock.claim(conversation.id))) {
    throw new HTTPException(409, {
      message: 'This conversation is already generating a response',
    });
  }
  const stopHeartbeat = conversationLock.startHeartbeat(conversation.id);

  // Flipped to true inside `onFinish` once the assistant message lands in
  // the DB. If it's still false during cleanup, the run errored before
  // persisting — we write a placeholder errored shell so reloads can
  // surface "something went wrong" instead of just dropping the response.
  let assistantPersisted = false;

  /** Releases the generation lock and records an errored shell if nothing was persisted */
  const finalize = async () => {
    stopHeartbeat();
    // A lock that was already cleared means the cancel operation ran (and wrote its own marker)
    const released = await conversationLock.release(conversation.id).catch((error: unknown) => {
      log.warn({ err: error, conversationId: conversation.id }, 'Failed to clear lock');
      return false;
    });

    // The stream errored before `onFinish` persisted anything — write an
    // empty assistant shell with `errored: true` so reloads can render the
    // error inline where the response should have been.
    if (!assistantPersisted && released) {
      await db.message
        .create({
          data: {
            conversationId: conversation.id,
            role: 'assistant',
            parts: [],
            errored: true,
          },
        })
        .catch((error: unknown) =>
          log.warn(
            { err: error, conversationId: conversation.id },
            'Failed to persist errored marker',
          ),
        );
    }
  };

  return createUIMessageStream({
    execute: async ({ writer }) => {
      // Retry-only cleanup: when the client explicitly asks for a retry,
      // drop just the most recent errored shell so it doesn't pile up next
      // to the new response on reload. Non-retry sends leave older errored
      // rows intact — they're history the user didn't act on.
      if (isRetry) {
        const latestErrored = await db.message.findFirst({
          where: { conversationId: conversation.id, errored: true },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (latestErrored) {
          await db.message
            .delete({ where: { id: latestErrored.id } })
            .catch((error: unknown) =>
              log.warn(
                { err: error, conversationId: conversation.id },
                'Failed to clear retried errored shell',
              ),
            );
        }
      }

      // Persist user messages up front so a reload mid-stream still sees
      // them and a Lambda death before streaming doesn't drop the input.
      // `skipDuplicates` covers regenerate-style retries that re-send an
      // existing id, so we don't need a pre-flight existence check.
      const userMessages = messages.filter((m) => m.role === 'user');
      if (userMessages.length > 0) {
        await Promise.all([
          db.message.createMany({
            data: userMessages.map((msg) => ({
              id: msg.id,
              conversationId: conversation.id,
              role: msg.role,
              parts: msg.parts as Prisma.InputJsonValue,
            })),
            skipDuplicates: true,
          }),
          // Bump the row to the top of the sidebar. New conversations already
          // have `lastMessageAt` set by the create, but follow-up sends to an
          // existing conversation need this nudge.
          existing
            ? db.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: new Date() },
              })
            : Promise.resolve(),
        ]).catch((error: unknown) =>
          log.error(
            { err: error, conversationId: conversation.id },
            'Failed to persist user messages',
          ),
        );
      }

      // If this is a new conversation, generate an AI title in parallel with the
      // chat stream. We hold onto the promise so the stream can emit a
      // `data-conversation-title` event when it resolves; the frontend updates
      // the sidebar cache directly without a follow-up fetch. On failure the
      // seeded title (already on the row) stands in as the fallback.
      const titlePromise =
        !existing && titleSeed
          ? generateChatTitle({
              input: { seed: titleSeed },
              context: { conversationId: conversation.id },
            })
              .then(async (title) => {
                if (!title) {
                  return null;
                }
                await db.conversation.update({
                  where: { id: conversation.id },
                  data: { title },
                });
                return title;
              })
              .catch((error: unknown) => {
                log.warn(
                  { err: error, conversationId: conversation.id },
                  'Failed to generate conversation title — keeping seeded title',
                );
                return null;
              })
          : null;

      const { result, traceId } = await streamChatTurn({
        input: { conversationId: conversation.id, messages },
        context: { user, organization },
      });

      writer.merge(
        result.toUIMessageStream({
          generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
          // Attach the Langfuse trace ID to the assistant message metadata
          messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
              return { traceId };
            }
            return;
          },
          onError: (error) => {
            // Surface the real cause in Lambda logs so we can diagnose stream failures
            // (Bedrock validation errors, S3 download failures, tool errors, etc.).
            const err = error as {
              name?: string;
              message?: string;
              statusCode?: number;
              data?: unknown;
            };
            log.error(
              {
                err: error,
                name: err.name,
                message: err.message,
                statusCode: err.statusCode,
                data: err.data,
                conversationId: conversation.id,
              },
              'sendMessage: stream error',
            );
            return err.message ?? 'An error occurred while generating the response.';
          },
          onFinish: async ({ messages: allMessages }) => {
            try {
              // A lock that can't be extended was cleared by the cancel operation
              // (which wrote its own marker), so don't persist on top of it.
              if (!(await conversationLock.extend(conversation.id))) {
                log.info(
                  { conversationId: conversation.id },
                  'sendMessage: lock cleared mid-stream, skipping persistence',
                );
                return;
              }

              // `skipDuplicates` covers any input messages we already
              // wrote up-front (or that the client re-sent from history),
              // so we can pass `allMessages` through without filtering.
              await db.message.createMany({
                data: allMessages.map((msg) => ({
                  id: msg.id,
                  conversationId: conversation.id,
                  role: msg.role,
                  parts: msg.parts as Prisma.InputJsonValue,
                  // Store trace ID on assistant messages for feedback scoring
                  traceId: msg.role === 'assistant' ? traceId : undefined,
                })),
                skipDuplicates: true,
              });
              assistantPersisted = true;
            } catch (error) {
              log.error(
                { err: error, conversationId: conversation.id },
                'Failed to persist chat messages',
              );
            }
          },
        }),
      );

      // Wait for the title to resolve, then emit a transient data event.
      // The connection stays open until execute() returns, so the merged
      // chat stream will already have flushed by the time we get here.
      const title = await titlePromise;
      if (title) {
        writer.write({
          type: 'data-conversation-title',
          data: { title },
          transient: true,
        });
      }
    },
    onError: (error) => {
      log.error({ err: error, conversationId: conversation.id }, 'sendMessage: stream failed');
      return error instanceof Error
        ? error.message
        : 'An error occurred while generating the response.';
    },
    // Fires once the merged response stream has fully settled, so the lock
    // outlives the whole generation rather than just the execute() call.
    onFinish: finalize,
  });
};

/** Cancels an in-progress response, saving the partial message as cancelled */
export const cancelGeneration = async (
  {
    conversationId,
    partial,
  }: {
    conversationId: string;
    /** The in-progress assistant message the user saw before stopping */
    partial?: z.infer<typeof chatSchema.cancel>['partial'];
  },
  context: AuthContext,
) => {
  await findOwnedConversation(conversationId, context);

  // Lambda doesn't pass client disconnects to the producer, so we can't stop the model. Clearing
  // the lock is enough: the producer checks it before persisting and discards its response.
  // Nothing to cancel if the producer finished before the user hit Stop
  if (!(await conversationLock.release(conversationId))) {
    return { cancelled: false };
  }

  // Persist the partial so a reload renders the same content + badge the user saw. Fall back
  // to an empty parts array if no partial was supplied.
  await db.message.create({
    data: {
      id: partial?.id,
      conversationId,
      role: 'assistant',
      parts: (partial?.parts ?? []) as Prisma.InputJsonValue,
      cancelled: true,
    },
  });
  return { cancelled: true };
};

/** Reconnects to a response generating elsewhere (another tab, or a Lambda that died) */
export const reconnectToGeneration = async (conversationId: string, context: AuthContext) => {
  // Ownership check up-front so a malicious client can't make us poll on
  // a conversation it doesn't own.
  await findOwnedConversation(conversationId, context);

  return createUIMessageStream({
    execute: async ({ writer }) => {
      // oxlint-disable-next-line no-await-in-loop -- Long-poll: each check waits on the previous one
      while (await conversationLock.isHeld(conversationId)) {
        // Keepalive — flushes a transient chunk so the response stream
        // keeps trickling bytes while we long-poll. Without it AWS
        // sees a stalled connection and tears it down before the
        // producer finishes. `transient: true` keeps it out of the
        // rendered message; the client's `onData` already ignores
        // any data part it doesn't recognize.
        writer.write({
          type: 'data-keepalive',
          data: { at: Date.now() },
          transient: true,
        });
        // oxlint-disable-next-line no-await-in-loop -- Waits between polls
        await new Promise((resolve) => setTimeout(resolve, RECONNECT_POLL_MS));
      }

      // If the latest message is from the assistant, it's the response to replay. Otherwise the
      // producer died before persisting anything.
      const latest = await db.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
      });
      if (latest?.role === 'assistant') {
        for (const chunk of streamFromMessage(latest)) {
          writer.write(chunk);
        }
      } else {
        writer.write({
          type: 'error',
          errorText: 'The previous response was interrupted. Please retry.',
        });
      }
    },
    // The orphaned lock has now been "resolved" (either replayed or errored).
    // Clear it so future reloads don't re-trigger reconnect, without ever
    // stomping on an actively-heartbeating producer's claim.
    onFinish: async () => {
      await conversationLock
        .releaseIfExpired(conversationId)
        .catch((error: unknown) =>
          log.warn({ err: error, conversationId }, 'Failed to clear lock from reconnect'),
        );
    },
  });
};

/** Lists the user's conversations, most recent first, with cursor pagination */
export const listConversations = async (
  { cursor, limit }: { cursor?: string; limit: number },
  { user, organization }: AuthContext,
) => {
  const conversations = await db.conversation.findMany({
    where: { userId: user.id, organizationId: organization.id },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      lastMessageAt: true,
    },
  });

  const hasMore = conversations.length > limit;
  const items = hasMore ? conversations.slice(0, -1) : conversations;
  const nextCursor = hasMore ? items.at(-1)?.id : undefined;

  return { items, nextCursor };
};

/** Gets a conversation with all of its messages (file URLs freshly signed) */
export const getConversation = async (conversationId: string, context: AuthContext) => {
  const conversation = await findOwnedConversation(conversationId, context);
  const storedMessages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  // Reconstruct UIMessages with metadata (traceId + feedback), re-signing file URLs
  const messages = await Promise.all(
    storedMessages.map(async (msg) => ({
      id: msg.id,
      role: msg.role as UIMessage['role'],
      parts: await signFileUrls(msg.parts as unknown as UIMessage['parts']),
      createdAt: msg.createdAt,
      metadata: {
        traceId: msg.traceId ?? undefined,
        feedback: msg.feedback ?? undefined,
        cancelled: msg.cancelled ?? undefined,
        errored: msg.errored ?? undefined,
      },
    })),
  );

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    // Non-null when a send is generating a response (or recently died
    // without clearing the lock). The frontend reads this to decide
    // whether to reconnect instead of starting fresh.
    generatingUntil: conversation.generatingUntil,
    messages,
  };
};

/** Renames a conversation */
export const renameConversation = async (
  { conversationId, title }: { conversationId: string; title: string },
  context: AuthContext,
) => {
  await findOwnedConversation(conversationId, context);
  return db.conversation.update({
    where: { id: conversationId },
    data: { title },
    select: { id: true, title: true },
  });
};

/** Deletes a conversation and its messages, stopping its code sandbox if it has one */
export const deleteConversation = async (conversationId: string, context: AuthContext) => {
  const conversation = await findOwnedConversation(conversationId, context);
  if (conversation.sandboxId) {
    await sandboxManager.stop(conversation.sandboxId);
  }
  await db.conversation.delete({ where: { id: conversationId } });
};

/** Records thumbs up/down feedback on an assistant message and scores its Langfuse trace */
export const submitFeedback = async (
  { messageId, rating, comment }: z.infer<typeof chatSchema.feedback>,
  { user, organization }: AuthContext,
) => {
  // Find the message and verify ownership through the conversation
  const message = await db.message.findFirst({
    where: { id: messageId },
    include: { conversation: { select: { userId: true, organizationId: true } } },
  });
  if (
    !message ||
    message.conversation.userId !== user.id ||
    message.conversation.organizationId !== organization.id
  ) {
    throw new HTTPException(404, { message: 'Message not found' });
  }

  // Persist feedback as a boolean on the message
  await db.message.update({
    where: { id: messageId },
    data: { feedback: rating === 'up' },
  });

  // Score the Langfuse trace if we have one
  if (message.traceId) {
    try {
      ai.scoreTrace({
        traceId: message.traceId,
        name: 'user-feedback',
        score: rating === 'up',
        comment,
      });
      await ai.flush();
    } catch (error) {
      log.warn({ err: error, traceId: message.traceId }, 'Failed to score Langfuse trace');
    }
  }
};
