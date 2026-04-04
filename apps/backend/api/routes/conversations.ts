import { ORPCError } from '@orpc/server';
import { ai } from '@repo/ai';
import { log } from '@repo/logs';
import { chatSchema } from '@repo/schemas';
import type { UIMessage } from 'ai';
import { z } from 'zod';

import { orpc } from '@/core';
import { db } from '@/db';

import { protectedProcedure } from '../procedures';

/** The conversations router — CRUD for chat conversations */
export const conversationsRouter = orpc.prefix('/conversations').router({
  /** List the current user's conversations (most recent first) */
  list: protectedProcedure
    .route({
      method: 'GET',
      path: '/',
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
        orderBy: { updatedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
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
      path: '/{id}',
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

      // Reconstruct UIMessages from stored data
      const messages: UIMessage[] = conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as UIMessage['role'],
        parts: msg.parts as unknown as UIMessage['parts'],
        createdAt: msg.createdAt,
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
      path: '/{id}',
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
      path: '/{id}',
      summary: 'Delete a conversation',
      tags: ['Chat'],
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const conversation = await db.conversation.findFirst({
        where: { id: input.id, userId: context.user.id, organizationId: context.organization.id },
      });

      if (!conversation) {
        throw new ORPCError('NOT_FOUND', { message: 'Conversation not found' });
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
