import type { Message as DbMessage, Prisma } from '@prisma/client';
import { ai, models } from '@repo/ai';
import { log } from '@repo/logs';
import { chatSchema } from '@repo/schemas';
import {
  type UIMessage,
  type UIMessageChunk,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  Output,
  smoothStream,
  stepCountIs,
} from 'ai';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import { toAiSdkTools } from '@/ai/sdk';
import { storage } from '@/core/storage';
import { db } from '@/db';

import { type ProtectedEnv, requireAuth } from '../middleware';

/** How long a `chat.send` claim survives without a heartbeat before another caller can take over. */
const LOCK_TTL_MS = 30_000;

/** Heartbeat cadence — must be comfortably under {@link LOCK_TTL_MS}. */
const HEARTBEAT_INTERVAL_MS = 20_000;

/** Poll cadence used by `chat.reconnect` while waiting for the lock to clear. */
const RECONNECT_POLL_MS = 5000;

/**
 * Stored file URLs sometimes expire (signed presigned URLs) before the AI SDK
 * tries to download them. Intercept any URL that points at our bucket and read
 * the bytes directly via the Lambda's IAM creds instead of trusting the URL.
 */
const downloadUploadsFromS3 = async (
  requested: ReadonlyArray<{ url: URL; isUrlSupportedByModel: boolean }>,
) =>
  Promise.all(
    requested.map(async (req) => {
      if (req.isUrlSupportedByModel) {
        return null;
      }
      const key = storage.keyFromUrl({ url: req.url });
      if (!key) {
        return null;
      }
      try {
        const result = await storage.read({ key });
        if (!result) {
          throw new Error(`Empty body for uploads object: ${key}`);
        }
        return result;
      } catch (error) {
        log.error({ err: error, key }, 'chat.send: failed to read uploads object');
        throw error;
      }
    }),
  );

/**
 * Bedrock's Converse API restricts document file names to alphanumeric, whitespace,
 * hyphens, parentheses, and square brackets, with no consecutive whitespace. User
 * uploads routinely contain dots, underscores, and other characters, so strip them
 * here before the AI SDK forwards the name to Bedrock.
 */
const sanitiseBedrockFilename = (name: string): string => {
  const cleaned = name
    .replaceAll(/[^a-zA-Z0-9\s\-()[\]]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : 'file';
};

/**
 * Returns a copy of the messages with file-part filenames sanitised for Bedrock
 * and unique within the payload (Bedrock rejects duplicate filenames).
 */
const sanitizeFileFilenames = (messages: UIMessage[]): UIMessage[] => {
  let index = 0;
  return messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => {
      if (p.type !== 'file' || !p.filename) {
        return p;
      }
      index += 1;
      return { ...p, filename: `${sanitiseBedrockFilename(p.filename)} (${index})` };
    }),
  }));
};

/**
 * Replay a persisted assistant message as a UIMessageChunk stream so the
 * client's `useChat` sees something indistinguishable from a fresh generation.
 * Used by `chat.reconnect` when a stream was started in another tab or Lambda.
 *
 * The persisted `parts` are the post-merge shape produced by `onFinish`, so we
 * just need to emit `start` → per-part chunks → `finish`. Text and reasoning
 * get synthetic IDs because they're stream-scoped identifiers the client uses
 * to thread deltas; the persisted shape doesn't carry them.
 */
function* streamFromMessage(message: DbMessage): Generator<UIMessageChunk> {
  yield { type: 'start', messageId: message.id };

  const parts = (Array.isArray(message.parts) ? message.parts : []) as Array<
    Record<string, unknown> & { type: string }
  >;
  let textCounter = 0;
  let reasoningCounter = 0;
  for (const part of parts) {
    if (part.type === 'text' && typeof part.text === 'string') {
      const id = `replay-text-${textCounter++}`;
      yield { type: 'text-start', id };
      yield { type: 'text-delta', id, delta: part.text };
      yield { type: 'text-end', id };
      continue;
    }
    if (part.type === 'reasoning' && typeof part.text === 'string') {
      const id = `replay-reasoning-${reasoningCounter++}`;
      yield { type: 'reasoning-start', id };
      yield { type: 'reasoning-delta', id, delta: part.text };
      yield { type: 'reasoning-end', id };
      continue;
    }
    if (part.type === 'step-start') {
      yield { type: 'start-step' };
      continue;
    }
    if (part.type === 'file' && typeof part.url === 'string') {
      yield {
        type: 'file',
        url: part.url,
        mediaType: typeof part.mediaType === 'string' ? part.mediaType : '',
      };
      continue;
    }
    if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
      const dynamic = part.type === 'dynamic-tool';
      let toolName = part.type.slice('tool-'.length);
      if (dynamic) {
        toolName = typeof part.toolName === 'string' ? part.toolName : 'unknown';
      }
      const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : '';
      yield {
        type: 'tool-input-available',
        toolCallId,
        toolName,
        input: part.input,
        dynamic,
      };
      if (part.state === 'output-available' || 'output' in part) {
        yield {
          type: 'tool-output-available',
          toolCallId,
          output: part.output,
          dynamic,
        };
      } else if (part.state === 'output-error' || typeof part.errorText === 'string') {
        yield {
          type: 'tool-output-error',
          toolCallId,
          errorText: typeof part.errorText === 'string' ? part.errorText : 'Tool execution failed',
          dynamic,
        };
      }
    }
  }

  yield { type: 'finish' };
}

/** Generates a short sidebar title for a conversation from its first message */
const generateTitle = ai.observe('generate-chat-title', async (titleSeed: string) => {
  const { output } = await ai.generateText({
    output: Output.object({ schema: z.object({ title: z.string().max(80) }) }),
    prompt: `Generate a short, descriptive title (3-6 words) for a chat conversation that starts with this message. Aim to keep it under 35 characters so it fits comfortably in a sidebar — slightly longer is fine if needed for clarity.\n\n"${titleSeed.slice(0, 500)}"`,
  });
  return output.title;
});

/** The chat router — streaming AI chat, conversation CRUD, and feedback */
export const chatRouter = new Hono<ProtectedEnv>()
  .use(requireAuth)
  /** Send a message and stream the AI response */
  .post(
    '/chat',
    describeRoute({
      summary: 'Send a chat message',
      tags: ['Chat'],
    }),
    validator('json', chatSchema.chatMessage),
    async (c) => {
      const user = c.get('user');
      const organization = c.get('organization');
      const input = c.req.valid('json');
      const { id: conversationId } = input;
      // Cast to UIMessage[] — the SDK's full part union can't be expressed in Zod
      const messages = input.messages as unknown as UIMessage[];

      // Seed a title from the first user text part so the row never appears
      // as "untitled" in the sidebar. AI title generation runs in parallel
      // and overwrites this seed when it lands.
      const titleSeed = messages
        .filter((m) => m.role === 'user')
        .flatMap((m) => m.parts)
        .find((p): p is { type: 'text'; text: string } => p.type === 'text')?.text;
      const truncateTitle = (s: string) => {
        const trimmed = s.trim().replaceAll(/\s+/g, ' ');
        return trimmed.length > 60 ? `${trimmed.slice(0, 60).trimEnd()}…` : trimmed;
      };
      const seededTitle = titleSeed ? truncateTitle(titleSeed) : 'New chat';

      // Look the row up first so we can tell whether this send creates the
      // conversation (the optimistic-ID pattern means the client navigates to
      // /chat/[id] before the row exists). Only the create path applies the
      // seeded title, and only the create path schedules AI title generation
      // later — so a follow-up send never re-titles an existing row.
      const existing = conversationId
        ? await db.conversation.findUnique({ where: { id: conversationId } })
        : null;
      if (
        existing &&
        (existing.userId !== user.id || existing.organizationId !== organization.id)
      ) {
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
            title: seededTitle,
          },
        }));

      // Atomic claim of the generation lock. The conditional update only succeeds
      // if no other producer is currently active (either no lock or a stale one).
      // A 0-row result means another tab/session is already generating — the
      // client should reconnect to that stream instead of starting a new one.
      const claimed = await db.conversation.updateMany({
        where: {
          id: conversation.id,
          OR: [{ generatingUntil: null }, { generatingUntil: { lt: new Date() } }],
        },
        data: { generatingUntil: new Date(Date.now() + LOCK_TTL_MS) },
      });
      if (claimed.count === 0) {
        throw new HTTPException(409, {
          message: 'This conversation is already generating a response',
        });
      }

      // Heartbeat — push the lock forward every interval so it only expires if
      // we actually die (OOM, Lambda timeout, SIGKILL). The `not: null` guard
      // means a heartbeat that fires while/after cleanup ran is a no-op
      // instead of resurrecting the lock.
      const heartbeat = setInterval(() => {
        db.conversation
          .updateMany({
            where: { id: conversation.id, generatingUntil: { not: null } },
            data: { generatingUntil: new Date(Date.now() + LOCK_TTL_MS) },
          })
          .catch((error) =>
            log.warn({ err: error, conversationId: conversation.id }, 'Lock heartbeat failed'),
          );
      }, HEARTBEAT_INTERVAL_MS);

      // Flipped to true inside `onFinish` once the assistant message lands in
      // the DB. If it's still false during cleanup, the run errored before
      // persisting — we write a placeholder errored shell so reloads can
      // surface "something went wrong" instead of just dropping the response.
      let assistantPersisted = false;

      /**
       * Releases the generation lock and, when nothing was persisted, records an
       * errored shell. Runs once the whole stream settles (success or failure);
       * the lock TTL covers the case where the Lambda dies before we get here.
       */
      const finalize = async () => {
        // Release the lock atomically and use the row count as the cancel
        // signal: 0 means `chat.cancel` already cleared it (and wrote its own
        // marker), 1 means we cleared our own active lock.
        clearInterval(heartbeat);
        const cleared = await db.conversation
          .updateMany({
            where: { id: conversation.id, generatingUntil: { not: null } },
            data: { generatingUntil: null },
          })
          .catch((error) => {
            log.warn({ err: error, conversationId: conversation.id }, 'Failed to clear lock');
            return { count: 0 };
          });
        const wasCancelled = cleared.count === 0;

        // The stream errored before `onFinish` persisted anything — write an
        // empty assistant shell with `errored: true` so reloads can render the
        // error inline where the response should have been.
        if (!assistantPersisted && !wasCancelled) {
          await db.message
            .create({
              data: {
                conversationId: conversation.id,
                role: 'assistant',
                parts: [],
                errored: true,
              },
            })
            .catch((error) =>
              log.warn(
                { err: error, conversationId: conversation.id },
                'Failed to persist errored marker',
              ),
            );
        }
      };

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          // Retry-only cleanup: when the client explicitly asks for a retry,
          // drop just the most recent errored shell so it doesn't pile up next
          // to the new response on reload. Non-retry sends leave older errored
          // rows intact — they're history the user didn't act on.
          if (input.isRetry) {
            const latestErrored = await db.message.findFirst({
              where: { conversationId: conversation.id, errored: true },
              orderBy: { createdAt: 'desc' },
              select: { id: true },
            });
            if (latestErrored) {
              await db.message
                .delete({ where: { id: latestErrored.id } })
                .catch((error) =>
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
            ]).catch((error) =>
              log.error(
                { err: error, conversationId: conversation.id },
                'Failed to persist user messages',
              ),
            );
          }

          // Convert tools to AI SDK format (in-process, zero network overhead)
          const tools = toAiSdkTools({
            user,
            organization,
            conversationId: conversation.id,
          });

          // If this is a new conversation, generate an AI title in parallel with the
          // chat stream. We hold onto the promise so the stream can emit a
          // `data-conversation-title` event when it resolves; the frontend updates
          // the sidebar cache directly without a follow-up fetch. On failure the
          // seeded title (already on the row) stands in as the fallback — we just
          // skip the overwrite.
          const titlePromise: Promise<string | null> | null =
            !existing && titleSeed
              ? (async () => {
                  try {
                    const title = await generateTitle(titleSeed);
                    if (!title) {
                      return null;
                    }
                    await db.conversation.update({
                      where: { id: conversation.id },
                      data: { title },
                    });
                    return title;
                  } catch (titleError) {
                    log.warn(
                      { err: titleError, conversationId: conversation.id },
                      'Failed to generate conversation title — keeping seeded title',
                    );
                    return null;
                  }
                })()
              : null;

          // Prepare messages for the model. convertToModelMessages invokes our experimental_download
          // hook, so any S3 download failure surfaces here — log it separately from stream errors.
          const modelMessages = await convertToModelMessages(sanitizeFileFilenames(messages), {
            // Drop any tool call left without a paired result from a cancelled
            // run — without this Claude rejects the request with "Tool results
            // are missing for tool calls X, Y, Z".
            ignoreIncompleteToolCalls: true,
          });

          // Stream the response inside a Langfuse observation so the run has a trace ID that
          // feedback can score later. The stream outlives the observation, so we skip capturing
          // its output (the AI SDK integration records the generation itself).
          const { streamResult, traceId } = await ai.observe(
            'chat',
            async (input: ModelMessage[]) => ({
              traceId: ai.getTraceId(),
              streamResult: await ai.streamText({
                system: `You are a helpful AI assistant with access to a persistent code execution environment.

When you need to analyze data, perform calculations, or generate visualizations:
- Use the run-code tool to execute Python code
- Use write-file to save data files for processing
- Use read-file to check outputs
- Use execute-command to install packages (e.g., pip install pandas matplotlib)

Files persist across messages in this conversation. You can build on previous work.
When generating charts, save them to /output/ (e.g., plt.savefig('/output/chart.png')).`,
                messages: input,
                // Give chat access to all our tools
                tools,
                // Allow the model to generate up to 10 steps
                stopWhen: stepCountIs(10),
                // Enable reasoning (up to 2000 tokens)
                model: models.bedrock['claude-sonnet-5-5'],
                providerOptions: {
                  bedrock: {
                    reasoningConfig: {
                      type: 'enabled',
                      budgetTokens: 2000,
                    },
                  },
                },
                // Allow the model to download files from S3
                experimental_download: downloadUploadsFromS3,
                // Smooth the token-by-token output into word-sized chunks with a small
                // delay so the UI renders typing-like text instead of jittery bursts.
                experimental_transform: smoothStream({ delayInMs: 25, chunking: 'word' }),
              }),
            }),
            { captureOutput: false },
          )(modelMessages);

          writer.merge(
            streamResult.toUIMessageStream({
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
                  'chat.send: stream error',
                );
                return err.message ?? 'An error occurred while generating the response.';
              },
              onFinish: async ({ messages: allMessages }) => {
                try {
                  // Re-bump the lock as a single-query cancel probe — a
                  // count of 0 means `chat.cancel` already cleared it (and
                  // wrote its own marker), so we should bail before
                  // persisting on top of that cancellation.
                  const stillActive = await db.conversation.updateMany({
                    where: { id: conversation.id, generatingUntil: { not: null } },
                    data: { generatingUntil: new Date(Date.now() + LOCK_TTL_MS) },
                  });
                  if (stillActive.count === 0) {
                    log.info(
                      { conversationId: conversation.id },
                      'chat.send: lock cleared mid-stream, skipping persistence',
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
          if (titlePromise) {
            const title = await titlePromise;
            if (title) {
              writer.write({
                type: 'data-conversation-title',
                data: { title },
                transient: true,
              });
            }
          }
        },
        onError: (error) => {
          log.error({ err: error, conversationId: conversation.id }, 'chat.send: stream failed');
          return error instanceof Error
            ? error.message
            : 'An error occurred while generating the response.';
        },
        // Fires once the merged response stream has fully settled, so the lock
        // outlives the whole generation rather than just the execute() call.
        onFinish: finalize,
      });

      return createUIMessageStreamResponse({ stream });
    },
  )
  /**
   * Cancel an in-progress chat response. The frontend calls this on Stop to
   * clear the generation lock and persist a visible "cancelled" marker as the
   * assistant's response. AWS Lambda response streaming doesn't propagate
   * client disconnects back to the producer Lambda's signal, so we can't
   * cancel the model itself — but the producer's `onFinish` checks the lock
   * before persisting, so its (possibly complete) response is discarded once
   * the cancel marker is in place.
   */
  .post(
    '/chat/conversations/:id/cancel',
    describeRoute({
      summary: 'Cancel an in-progress chat response',
      tags: ['Chat'],
    }),
    validator('param', z.object({ id: z.string() })),
    validator('json', chatSchema.cancel.omit({ id: true })),
    async (c) => {
      const { id } = c.req.valid('param');
      const { partial } = c.req.valid('json');
      const user = c.get('user');
      const organization = c.get('organization');

      // Verify ownership.
      const conversation = await db.conversation.findFirst({
        where: { id, userId: user.id, organizationId: organization.id },
        select: { id: true },
      });
      if (!conversation) {
        throw new HTTPException(404, { message: 'Conversation not found' });
      }

      // Conditional clear — if `generatingUntil` is already null, the producer
      // finished naturally before the user hit Stop; nothing to cancel.
      const released = await db.conversation.updateMany({
        where: { id, generatingUntil: { not: null } },
        data: { generatingUntil: null },
      });
      if (released.count === 0) {
        return c.json({ cancelled: false });
      }

      // Persist the in-progress assistant message (if the frontend sent one)
      // marked as cancelled, so post-reload renders the same partial content
      // + badge that the user saw before navigating away. Fall back to an
      // empty parts array if no partial was supplied.
      await db.message.create({
        data: {
          id: partial?.id,
          conversationId: id,
          role: 'assistant',
          parts: (partial?.parts ?? []) as Prisma.InputJsonValue,
          cancelled: true,
        },
      });
      return c.json({ cancelled: true });
    },
  )
  /**
   * Reconnect to an in-progress chat response. Used when a tab loads a
   * conversation whose `generatingUntil` is non-null (another tab or a now-dead
   * Lambda was producing a response). The handler long-polls until the lock
   * clears, then either replays the resulting assistant message or emits an
   * error chunk that surfaces in the UI exactly like a failed `send`.
   */
  .post(
    '/chat/conversations/:id/reconnect',
    describeRoute({
      summary: 'Reconnect to an in-progress chat response',
      tags: ['Chat'],
    }),
    validator('param', z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid('param');
      const user = c.get('user');
      const organization = c.get('organization');

      // Ownership check up-front so a malicious client can't make us poll on
      // a conversation it doesn't own.
      const owned = await db.conversation.findFirst({
        where: { id, userId: user.id, organizationId: organization.id },
        select: { id: true },
      });
      if (!owned) {
        throw new HTTPException(404, { message: 'Conversation not found' });
      }

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          while (true) {
            const conversation = await db.conversation.findUnique({
              where: { id },
              select: { generatingUntil: true },
            });
            const stillLocked =
              conversation?.generatingUntil && conversation.generatingUntil > new Date();
            if (!stillLocked) {
              // Find the most recent message. If it's an assistant message
              // it's the response we want to replay. Otherwise the producer
              // died before persisting anything — emit an error chunk so
              // the UI surfaces it the same way a failed `send` would.
              const latest = await db.message.findFirst({
                where: { conversationId: id },
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
              return;
            }
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
            await new Promise((resolve) => setTimeout(resolve, RECONNECT_POLL_MS));
          }
        },
        // The orphaned lock has now been "resolved" (either replayed or errored).
        // Clear it so future reloads don't re-trigger reconnect. The `lt` guard
        // ensures we never stomp on an actively-heartbeating producer's claim —
        // we only sweep up locks that have already expired.
        onFinish: async () => {
          await db.conversation
            .updateMany({
              where: { id, generatingUntil: { lt: new Date() } },
              data: { generatingUntil: null },
            })
            .catch((error) =>
              log.warn({ err: error, conversationId: id }, 'Failed to clear lock from reconnect'),
            );
        },
      });

      return createUIMessageStreamResponse({ stream });
    },
  )
  /** List the current user's conversations (most recent first) */
  .get(
    '/chat/conversations',
    describeRoute({
      summary: 'List conversations',
      tags: ['Chat'],
    }),
    validator(
      'query',
      z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      }),
    ),
    async (c) => {
      const { cursor, limit } = c.req.valid('query');
      const user = c.get('user');
      const organization = c.get('organization');

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

      return c.json({ items, nextCursor });
    },
  )
  /** Get a single conversation with all messages */
  .get(
    '/chat/conversations/:id',
    describeRoute({
      summary: 'Get conversation with messages',
      tags: ['Chat'],
    }),
    validator('param', z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid('param');
      const user = c.get('user');
      const organization = c.get('organization');

      const conversation = await db.conversation.findFirst({
        where: { id, userId: user.id, organizationId: organization.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new HTTPException(404, { message: 'Conversation not found' });
      }

      // Re-sign each file URL on the way out. Runs after the ownership check
      // above, so only conversation members receive working URLs. The stored
      // URL may have expired since it was first signed; we extract the key
      // and mint a fresh presigned URL.
      const signParts = async (parts: UIMessage['parts']): Promise<UIMessage['parts']> =>
        Promise.all(
          parts.map(async (p) => {
            if (p.type !== 'file' || typeof (p as { url?: unknown }).url !== 'string') {
              return p;
            }
            const stored = (p as { url: string }).url;
            try {
              const key = storage.keyFromUrl({ url: new URL(stored) });
              if (!key) {
                return p;
              }
              return {
                ...p,
                url: await storage.signUrl({ key, downloadFilename: p.filename }),
              };
            } catch {
              return p;
            }
          }),
        );

      // Reconstruct UIMessages with metadata (traceId + feedback)
      const messages = await Promise.all(
        conversation.messages.map(async (msg) => ({
          id: msg.id,
          role: msg.role as UIMessage['role'],
          parts: await signParts(msg.parts as unknown as UIMessage['parts']),
          createdAt: msg.createdAt,
          metadata: {
            traceId: msg.traceId ?? undefined,
            feedback: msg.feedback ?? undefined,
            cancelled: msg.cancelled ?? undefined,
            errored: msg.errored ?? undefined,
          },
        })),
      );

      return c.json({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        // Non-null when a `chat.send` is generating a response (or recently
        // died without clearing the lock). The frontend reads this to decide
        // whether to call `reconnectToStream` instead of starting fresh.
        generatingUntil: conversation.generatingUntil,
        messages,
      });
    },
  )
  /** Update a conversation's title */
  .patch(
    '/chat/conversations/:id',
    describeRoute({
      summary: 'Update conversation title',
      tags: ['Chat'],
    }),
    validator('param', z.object({ id: z.string() })),
    validator('json', z.object({ title: z.string().min(1).max(200) })),
    async (c) => {
      const { id } = c.req.valid('param');
      const { title } = c.req.valid('json');
      const user = c.get('user');
      const organization = c.get('organization');

      const conversation = await db.conversation.findFirst({
        where: { id, userId: user.id, organizationId: organization.id },
      });

      if (!conversation) {
        throw new HTTPException(404, { message: 'Conversation not found' });
      }

      const updated = await db.conversation.update({
        where: { id },
        data: { title },
        select: { id: true, title: true },
      });
      return c.json(updated);
    },
  )
  /** Delete a conversation and all its messages */
  .delete(
    '/chat/conversations/:id',
    describeRoute({
      summary: 'Delete a conversation',
      tags: ['Chat'],
    }),
    validator('param', z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid('param');
      const user = c.get('user');
      const organization = c.get('organization');

      const conversation = await db.conversation.findFirst({
        where: { id, userId: user.id, organizationId: organization.id },
        select: { id: true, sandboxId: true },
      });

      if (!conversation) {
        throw new HTTPException(404, { message: 'Conversation not found' });
      }

      // Stop the associated Daytona sandbox if one exists (use get, not getOrCreate, to avoid creating a new one)
      if (conversation.sandboxId) {
        try {
          const { Daytona } = await import('@daytonaio/sdk');
          const daytona = new Daytona();
          const sandbox = await daytona.get(conversation.sandboxId);
          await sandbox.stop();
        } catch {
          // Sandbox may already be gone — that's fine
        }
      }

      await db.conversation.delete({ where: { id } });
      return c.json({ success: true });
    },
  )
  /** Submit feedback (thumbs up/down + optional comment) on an assistant message */
  .post(
    '/chat/feedback',
    describeRoute({
      summary: 'Submit feedback on a message',
      tags: ['Chat'],
    }),
    validator('json', chatSchema.feedback),
    async (c) => {
      const input = c.req.valid('json');
      const user = c.get('user');
      const organization = c.get('organization');

      // Find the message and verify ownership through the conversation
      const message = await db.message.findFirst({
        where: { id: input.messageId },
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
        where: { id: input.messageId },
        data: { feedback: input.rating === 'up' },
      });

      // Score the Langfuse trace if we have one
      if (message.traceId) {
        try {
          ai.scoreTrace({
            traceId: message.traceId,
            name: 'user-feedback',
            score: input.rating === 'up',
            comment: input.comment,
          });
          await ai.flush();
        } catch (error) {
          log.warn({ err: error, traceId: message.traceId }, 'Failed to score Langfuse trace');
        }
      }

      return c.json({ success: true });
    },
  );
