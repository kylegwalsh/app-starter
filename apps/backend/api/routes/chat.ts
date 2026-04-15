import { ORPCError, streamToEventIterator } from '@orpc/server';
import type { Prisma } from '@prisma/client';
import { ai } from '@repo/ai';
import { log } from '@repo/logs';
import { chatSchema } from '@repo/schemas';
import { type UIMessage, convertToModelMessages, createIdGenerator, stepCountIs } from 'ai';
import { z } from 'zod';

import { toAiSdkTools } from '@/ai/sdk';
import { orpc } from '@/core';
import { db } from '@/db';

import { protectedProcedure } from '../procedures';

/** The chat router — streaming AI chat, conversation CRUD, and feedback */
export const chatRouter = orpc.prefix('/chat').router({
  /** Send a message and stream the AI response */
  send: protectedProcedure
    .route({
      method: 'POST',
      path: '/',
      summary: 'Send a chat message',
      tags: ['Chat'],
    })
    .input(chatSchema.chatMessage)
    .handler(async function* ({ context, input }) {
      const { user, organization } = context;
      const { id: conversationId } = input;
      // Cast to UIMessage[] — the SDK's full part union can't be expressed in Zod
      const messages = input.messages as unknown as UIMessage[];

      // Load existing conversation or create a new one.
      // When conversationId is provided, upsert — this supports the optimistic pattern
      // where the client generates an ID before navigating to /chat/[id].
      let conversation;
      if (conversationId) {
        conversation = await db.conversation.upsert({
          where: { id: conversationId },
          update: {},
          create: {
            id: conversationId,
            userId: user.id,
            organizationId: organization.id,
            lastMessageAt: new Date(),
          },
        });
        // Verify ownership (handles case where ID was guessed and belongs to another user)
        if (conversation.userId !== user.id || conversation.organizationId !== organization.id) {
          throw new ORPCError('NOT_FOUND', { message: 'Conversation not found' });
        }
      } else {
        conversation = await db.conversation.create({
          data: { userId: user.id, organizationId: organization.id, lastMessageAt: new Date() },
        });
      }

      // Convert tools to AI SDK format (in-process, zero network overhead)
      const tools = toAiSdkTools({
        user,
        organization,
        conversationId: conversation.id,
      });

      // If this is a new conversation, generate an AI title in parallel with the chat stream
      const isNewConversation = !conversation.title;
      if (isNewConversation) {
        const firstUserText = messages
          .filter((m) => m.role === 'user')
          .flatMap((m) => m.parts)
          .find((p): p is { type: 'text'; text: string } => p.type === 'text')?.text;

        if (firstUserText) {
          // Fire and forget — runs in parallel with the stream, don't block the response
          void (async () => {
            try {
              const result = await ai.generateObject({
                name: 'generate-title',
                schema: z.object({ title: z.string().max(80) }),
                prompt: `Generate a short, descriptive title (3-8 words) for a chat conversation that starts with this message:\n\n"${firstUserText.slice(0, 500)}"`,
              });
              await db.conversation.update({
                where: { id: conversation.id },
                data: { title: result.object.title },
              });
            } catch (titleError) {
              log.warn(
                { error: titleError, conversationId: conversation.id },
                'Failed to generate conversation title',
              );
            }
          })();
        }
      }

      // Stream the response using our traced wrapper
      const streamResult = await ai.streamText({
        system: `You are a helpful AI assistant with access to a persistent code execution environment.

When you need to analyze data, perform calculations, or generate visualizations:
- Use the run-code tool to execute Python code
- Use write-file to save data files for processing
- Use read-file to check outputs
- Use execute-command to install packages (e.g., pip install pandas matplotlib)

Files persist across messages in this conversation. You can build on previous work.
When generating charts, save them to /output/ (e.g., plt.savefig('/output/chart.png')).`,
        messages: await convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(5),
      });

      // Get existing message IDs for deduplication (avoids race conditions vs index-based slicing)
      const existingMessages = await db.message.findMany({
        where: { conversationId: conversation.id },
        select: { id: true },
      });
      const existingMessageIds = new Set(existingMessages.map((m) => m.id));

      // Persist new user messages immediately — fire and forget so the stream isn't blocked.
      // (onFinish only receives assistant messages, so user messages must be saved here.)
      const newUserMessages = messages.filter(
        (m) => m.role === 'user' && !existingMessageIds.has(m.id),
      );
      if (newUserMessages.length > 0) {
        const now = new Date();
        void Promise.all([
          db.message.createMany({
            data: newUserMessages.map((msg) => ({
              id: msg.id,
              conversationId: conversation.id,
              role: msg.role,
              parts: msg.parts as Prisma.InputJsonValue,
            })),
          }),
          db.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: now },
          }),
        ]).catch((error) => log.error({ error }, 'Failed to persist user messages'));
      }

      // Get the Langfuse trace ID so we can pass it to the client for feedback scoring
      const traceId = ai.getRequestTraceId();

      // Stream the AI response as oRPC event iterator
      yield* streamToEventIterator(
        streamResult.toUIMessageStream({
          generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
          // Attach the Langfuse trace ID to the assistant message metadata
          messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
              return { traceId };
            }
            return;
          },
          onFinish: async ({ messages: allMessages }) => {
            try {
              // Only persist messages that don't already exist in the DB
              const newMessages = allMessages.filter((msg) => !existingMessageIds.has(msg.id));
              if (newMessages.length === 0) {
                return;
              }

              const messageData: Prisma.MessageCreateManyInput[] = newMessages.map((msg) => ({
                id: msg.id,
                conversationId: conversation.id,
                role: msg.role,
                parts: msg.parts as Prisma.InputJsonValue,
                // Store trace ID on assistant messages for feedback scoring
                traceId: msg.role === 'assistant' ? traceId : undefined,
              }));

              await db.message.createMany({ data: messageData });
            } catch (error) {
              log.error(
                { error, conversationId: conversation.id },
                'Failed to persist chat messages',
              );
            }
          },
        }),
      );
    }),

  /** List the current user's conversations (most recent first) */
  list: protectedProcedure
    .route({
      method: 'GET',
      path: '/conversations',
      summary: 'List conversations',
      tags: ['Chat'],
    })
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .handler(async ({ context, input }) => {
      const conversations = await db.conversation.findMany({
        where: { userId: context.user.id, organizationId: context.organization.id },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          lastMessageAt: true,
        },
      });

      const hasMore = conversations.length > input.limit;
      const items = hasMore ? conversations.slice(0, -1) : conversations;
      const nextCursor = hasMore ? items.at(-1)?.id : undefined;

      return { items, nextCursor };
    }),

  /** Get a single conversation with all messages */
  get: protectedProcedure
    .route({
      method: 'GET',
      path: '/conversations/{id}',
      summary: 'Get conversation with messages',
      tags: ['Chat'],
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const conversation = await db.conversation.findFirst({
        where: { id: input.id, userId: context.user.id, organizationId: context.organization.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new ORPCError('NOT_FOUND', { message: 'Conversation not found' });
      }

      // Reconstruct UIMessages with metadata (traceId + feedback)
      const messages = conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as UIMessage['role'],
        parts: msg.parts as unknown as UIMessage['parts'],
        createdAt: msg.createdAt,
        metadata: {
          traceId: msg.traceId ?? undefined,
          feedback: msg.feedback ?? undefined,
        },
      }));

      return {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages,
      };
    }),

  /** Update a conversation's title */
  updateTitle: protectedProcedure
    .route({
      method: 'PATCH',
      path: '/conversations/{id}',
      summary: 'Update conversation title',
      tags: ['Chat'],
    })
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200),
      }),
    )
    .handler(async ({ context, input }) => {
      const conversation = await db.conversation.findFirst({
        where: { id: input.id, userId: context.user.id, organizationId: context.organization.id },
      });

      if (!conversation) {
        throw new ORPCError('NOT_FOUND', { message: 'Conversation not found' });
      }

      return db.conversation.update({
        where: { id: input.id },
        data: { title: input.title },
        select: { id: true, title: true },
      });
    }),

  /** Delete a conversation and all its messages */
  delete: protectedProcedure
    .route({
      method: 'DELETE',
      path: '/conversations/{id}',
      summary: 'Delete a conversation',
      tags: ['Chat'],
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const conversation = await db.conversation.findFirst({
        where: { id: input.id, userId: context.user.id, organizationId: context.organization.id },
        select: { id: true, sandboxId: true },
      });

      if (!conversation) {
        throw new ORPCError('NOT_FOUND', { message: 'Conversation not found' });
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

      await db.conversation.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /** Submit feedback (thumbs up/down + optional comment) on an assistant message */
  submitFeedback: protectedProcedure
    .route({
      method: 'POST',
      path: '/feedback',
      summary: 'Submit feedback on a message',
      tags: ['Chat'],
    })
    .input(chatSchema.feedback)
    .handler(async ({ context, input }) => {
      // Find the message and verify ownership through the conversation
      const message = await db.message.findFirst({
        where: { id: input.messageId },
        include: { conversation: { select: { userId: true, organizationId: true } } },
      });

      if (
        !message ||
        message.conversation.userId !== context.user.id ||
        message.conversation.organizationId !== context.organization.id
      ) {
        throw new ORPCError('NOT_FOUND', { message: 'Message not found' });
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
          log.warn({ error, traceId: message.traceId }, 'Failed to score Langfuse trace');
        }
      }

      return { success: true };
    }),
});
