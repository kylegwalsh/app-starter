import { chatSchema } from '@repo/schemas';
import { type UIMessage, createUIMessageStreamResponse } from 'ai';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';

import { type ProtectedEnv, requireAuth } from '@/api/middleware';

import {
  cancelGeneration,
  deleteConversation,
  getConversation,
  listConversations,
  reconnectToGeneration,
  renameConversation,
  sendMessage,
  submitFeedback,
} from './operations';

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
      const { id, messages, isRetry } = c.req.valid('json');
      const stream = await sendMessage(
        // Cast to UIMessage[] — the SDK's full part union can't be expressed in Zod
        { conversationId: id, messages: messages as unknown as UIMessage[], isRetry },
        c.var,
      );
      return createUIMessageStreamResponse({ stream });
    },
  )
  /** Cancel an in-progress chat response (the frontend calls this on Stop) */
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
      return c.json(await cancelGeneration({ conversationId: id, partial }, c.var));
    },
  )
  /** Reconnect to an in-progress chat response started elsewhere */
  .post(
    '/chat/conversations/:id/reconnect',
    describeRoute({
      summary: 'Reconnect to an in-progress chat response',
      tags: ['Chat'],
    }),
    validator('param', z.object({ id: z.string() })),
    async (c) => {
      const stream = await reconnectToGeneration(c.req.valid('param').id, c.var);
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
    async (c) => c.json(await listConversations(c.req.valid('query'), c.var)),
  )
  /** Get a single conversation with all messages */
  .get(
    '/chat/conversations/:id',
    describeRoute({
      summary: 'Get conversation with messages',
      tags: ['Chat'],
    }),
    validator('param', z.object({ id: z.string() })),
    async (c) => c.json(await getConversation(c.req.valid('param').id, c.var)),
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
      return c.json(await renameConversation({ conversationId: id, title }, c.var));
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
      await deleteConversation(c.req.valid('param').id, c.var);
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
      await submitFeedback(c.req.valid('json'), c.var);
      return c.json({ success: true });
    },
  );
