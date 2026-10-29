import type { Conversation, Prisma } from '@prisma/client';
import { ai, models, type Observed } from '@repo/ai';
import { analytics } from '@repo/analytics';
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
import type { z } from 'zod';

import { toAiSdkTools } from '@/ai/sdk';
import { ConflictError, NotFoundError } from '@/api/error';
import { db } from '@/db';
import { type AuthContext, sandboxManager } from '@/services';

import {
  downloadUploadsFromS3,
  prepareAttachmentsForModel,
  sanitizeFileFilenames,
  signFileUrls,
} from './lib/attachments';
import { compactContext } from './lib/compaction';
import { conversationLock } from './lib/lock';
import { loadMessages, toUIMessage } from './lib/messages';
import { getTitleSeed, saveGeneratedTitle, truncateTitle } from './lib/title';
import { SYSTEM_PROMPT } from './prompts';

const DEFAULT_ERROR_MESSAGE = 'An error occurred while generating the response.';

type UserMessage = z.infer<typeof chatSchema.chatMessage>['message'];

// ---------- HELPERS ----------
/** Returns the conversation if the signed-in user and organization own it, or throws a 404 */
const requireOwned = (conversation: Conversation | null, { user, organization }: AuthContext) => {
  if (conversation?.userId !== user.id || conversation.organizationId !== organization.id) {
    throw new NotFoundError('Conversation not found');
  }
  return conversation;
};

/** Finds a conversation belonging to the signed-in user and organization, or throws a 404 */
const findOwnedConversation = async (id: string, context: AuthContext) =>
  requireOwned(await db.conversation.findUnique({ where: { id } }), context);

/** Loads a conversation on follow-up sends, or creates it (with a seeded title) on the first */
const findOrCreateConversation = async (
  conversationId: string,
  message: UserMessage,
  context: AuthContext,
) => {
  const { user, organization } = context;
  const existing = await db.conversation.findUnique({ where: { id: conversationId } });
  if (existing) {
    return { conversation: requireOwned(existing, context), isNew: false };
  }
  const seed = getTitleSeed(message);
  const conversation = await db.conversation.create({
    data: {
      id: conversationId,
      userId: user.id,
      organizationId: organization.id,
      title: seed ? truncateTitle(seed) : 'New chat',
    },
  });
  return { conversation, isNew: true };
};

/**
 * Saves the user's message and returns the history to answer. Re-sending a saved message is a
 * retry: the replies after it are dropped so it gets answered fresh.
 */
const prepareTurn = async (conversationId: string, message: UserMessage) => {
  const saved = await db.message.findUnique({ where: { id: message.id } });
  if (saved && saved.conversationId !== conversationId) {
    throw new NotFoundError('Message not found');
  }

  await db.$transaction([
    saved
      ? db.message.deleteMany({ where: { conversationId, createdAt: { gt: saved.createdAt } } })
      : db.message.create({
          data: {
            id: message.id,
            conversationId,
            role: 'user',
            parts: message.parts as Prisma.InputJsonValue,
          },
        }),
    // Bump the conversation to the top of the sidebar
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);

  const history = await loadMessages(conversationId);
  return { isRetry: saved !== null, messages: history.map((m) => toUIMessage(m)) };
};

/** Turns a stream error into the message shown to the user */
const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;

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
    input: { conversationId, messages, compactedThrough, contextTokens },
    context: { user, organization, abortSignal },
    observation,
  }: Observed<{
    input: {
      /** The conversation being answered (scopes the code sandbox and the trace session) */
      conversationId: string;
      /** The full conversation history, ending with the user's latest message */
      messages: UIMessage[];
      /** How far context compaction has swept the thread (see `lib/compaction.ts`) */
      compactedThrough: number;
      /** The measured size of the thread after the last turn */
      contextTokens: number | null;
    };
    context: AuthContext & {
      /** Stops generation (and any further tool calls) when the user cancels */
      abortSignal?: AbortSignal;
    };
  }>) => {
    // Send the model only the attachments it can read; the rest become notes pointing at the
    // sandbox copy the code tools see
    const readable = sanitizeFileFilenames(await prepareAttachmentsForModel(messages));
    const modelMessages = await convertToModelMessages(readable, {
      // Drop any tool call left without a paired result from a cancelled run — without this
      // Claude rejects the request with "Tool results are missing for tool calls X, Y, Z".
      ignoreIncompleteToolCalls: true,
    });

    // Updated as the turn runs, so the caller can store how far the thread has been swept
    const compaction = { compactedThrough };

    const result = await ai.streamText({
      model: models.bedrock['claude-sonnet-5-5'],
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      abortSignal,
      // Compact before every step, since one step can append many large tool results
      prepareStep: ({ messages: stepMessages, steps, stepNumber }) => {
        const compacted = compactContext({
          messages: stepMessages,
          steps,
          compactedThrough: compaction.compactedThrough,
          contextTokens,
        });
        if (compacted.savedTokens > 0) {
          log.info(
            {
              conversationId,
              stepNumber,
              compactedThrough: compacted.compactedThrough,
              savedTokens: Math.round(compacted.savedTokens),
            },
            'Compacted chat context',
          );
        }
        compaction.compactedThrough = compacted.compactedThrough;
        return { messages: compacted.messages };
      },
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

    return { result, traceId: observation.traceId, compaction };
  },
);

/** Sends a message and streams back the AI response, creating the conversation on first send */
export const sendMessage = async (
  {
    conversationId,
    message,
  }: {
    /** The conversation to send to (created on first send with this ID) */
    conversationId: string;
    /** The user message to answer (a saved one is a retry) */
    message: UserMessage;
  },
  context: AuthContext,
) => {
  const { user, organization } = context;
  const { conversation, isNew } = await findOrCreateConversation(conversationId, message, context);

  // Only one response generates at a time (another tab may be mid-response)
  const lease = await conversationLock.claim(conversation.id);
  if (!lease) {
    throw new ConflictError('This conversation is already generating a response');
  }
  const turn = await prepareTurn(conversation.id, message).catch(async (error: unknown) => {
    await lease.release();
    throw error;
  });

  // Cancelling clears the lock; the heartbeat notices and aborts so the model stops spending
  // tokens and running tools
  const abortController = new AbortController();
  const stopHeartbeat = lease.startHeartbeat(() => abortController.abort());

  await analytics.chatMessageSent({
    userId: user.id,
    organizationId: organization.id,
    conversationId: conversation.id,
    isNewConversation: isNew,
    isRetry: turn.isRetry,
    attachmentCount: message.parts.filter((part) => part.type === 'file').length,
    messageCount: turn.messages.length,
  });

  // A failed turn can reach both the reply's `onFinish` and the outer `onError`, so report only the
  // first. A failed turn also isn't saved: the conversation then ends on the user's message, which
  // the client offers to retry.
  let failed = false;
  const reportError = (error: unknown, properties?: Record<string, unknown>) => {
    if (failed) {
      return;
    }
    failed = true;
    analytics.captureException(error, { conversationId: conversation.id, ...properties });
  };

  return createUIMessageStream({
    execute: async ({ writer }) => {
      // Title a new conversation alongside the response, so the sidebar can show it mid-stream
      const seed = isNew ? getTitleSeed(message) : undefined;
      const titlePromise = seed ? saveGeneratedTitle(conversation.id, seed) : undefined;

      const { result, traceId, compaction } = await streamChatTurn({
        input: {
          conversationId: conversation.id,
          messages: turn.messages,
          compactedThrough: conversation.compactedThrough,
          contextTokens: conversation.contextTokens,
        },
        context: { user, organization, abortSignal: abortController.signal },
      });

      writer.merge(
        result.toUIMessageStream({
          generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
          // Attach the Langfuse trace ID so feedback can score it
          messageMetadata: ({ part }) => (part.type === 'finish' ? { traceId } : undefined),
          // Also formats failed tool calls, which the model sees and usually recovers from, so a
          // failed turn is judged by the outcome in `onFinish` instead
          onError: (error) => getErrorMessage(error),
          onFinish: async ({ responseMessage, isAborted, outcome }) => {
            if (outcome.status === 'failed') {
              reportError(outcome.error, { traceId });
              return;
            }
            // A cleared lock means the user cancelled, and the cancel saved what they saw
            if (failed || isAborted || !(await lease.extend())) {
              return;
            }
            try {
              // The last step's prompt + reply is the thread's measured size, which sizes the next turn
              const usage = await result.usage;
              await db.$transaction([
                db.message.create({
                  data: {
                    id: responseMessage.id,
                    conversationId: conversation.id,
                    role: 'assistant',
                    parts: responseMessage.parts as Prisma.InputJsonValue,
                    traceId,
                  },
                }),
                db.conversation.update({
                  where: { id: conversation.id },
                  data: {
                    compactedThrough: compaction.compactedThrough,
                    contextTokens:
                      usage.inputTokens == null
                        ? undefined
                        : usage.inputTokens + (usage.outputTokens ?? 0),
                  },
                }),
              ]);
            } catch (error) {
              await analytics.captureException(error, { conversationId: conversation.id, traceId });
            }
          },
        }),
      );

      // The response streams while this waits, so the title arrives as soon as it's ready
      const title = await titlePromise;
      if (title) {
        writer.write({ type: 'data-conversation-title', data: { title }, transient: true });
      }
    },
    onError: (error) => {
      reportError(error);
      return getErrorMessage(error);
    },
    // Fires once the merged stream settles, so the lock covers the whole generation
    onFinish: async () => {
      stopHeartbeat();
      await lease.release().catch((error: unknown) => {
        log.warn({ err: error, conversationId: conversation.id }, 'Failed to release lock');
      });
    },
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

  // Clearing the lock stops the producer: its heartbeat aborts the model, and it won't save its
  // own response. Nothing to cancel if it finished before the user hit Stop.
  if (!(await conversationLock.clear(conversationId))) {
    return { cancelled: false };
  }

  // Save what the user saw so a reload renders the same content and "stopped" badge
  const saveCancelled = db.message.create({
    data: {
      id: partial?.id,
      conversationId,
      role: 'assistant',
      parts: (partial?.parts ?? []) as Prisma.InputJsonValue,
      cancelled: true,
    },
  });
  if (!partial) {
    await saveCancelled;
    return { cancelled: true };
  }
  // Replaces the producer's copy if it saved in the moment before the lock cleared
  await db.$transaction([
    db.message.deleteMany({ where: { id: partial.id, conversationId } }),
    saveCancelled,
  ]);
  return { cancelled: true };
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
  const storedMessages = await loadMessages(conversationId);

  const messages = await Promise.all(
    storedMessages.map(async (msg) => {
      const message = toUIMessage(msg);
      return {
        ...message,
        parts: await signFileUrls(message.parts),
        createdAt: msg.createdAt,
        metadata: {
          traceId: msg.traceId ?? undefined,
          feedback: msg.feedback ?? undefined,
          cancelled: msg.cancelled ?? undefined,
        },
      };
    }),
  );

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    // A response is still generating (e.g. in another tab), so the client waits for it
    isGenerating: conversationLock.isActive(conversation.generatingUntil),
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
    throw new NotFoundError('Message not found');
  }

  // Persist feedback as a boolean on the message
  await db.message.update({
    where: { id: messageId },
    data: { feedback: rating === 'up' },
  });

  await analytics.feedbackSubmitted({
    userId: user.id,
    organizationId: organization.id,
    feature: 'chat',
    rating,
    comment,
    traceId: message.traceId ?? undefined,
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
