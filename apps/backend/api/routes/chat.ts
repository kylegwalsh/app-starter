import type { Prisma } from '@prisma/client';
import { ai } from '@repo/ai';
import { log } from '@repo/logs';
import { chatSchema } from '@repo/schemas';
import { type UIMessage, convertToModelMessages, createIdGenerator, stepCountIs } from 'ai';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import { toAISDKTools } from '@/ai/adapter';
import { auth } from '@/core';
import { db } from '@/db';

/** Chat sub-app — mounted at /api/chat in the main API */
const chatApp = new Hono();

chatApp.post('/', async (c) => {
  // Authenticate via session cookie
  const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!sessionData?.user) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const user = sessionData.user;
  const organizationId = sessionData.session?.activeOrganizationId;
  if (!organizationId) {
    throw new HTTPException(403, { message: 'Active organization required' });
  }

  // Validate the request body
  const parseResult = chatSchema.chatMessage.safeParse(await c.req.json());
  if (!parseResult.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const { id: conversationId } = parseResult.data;
  // Validated above — cast to UIMessage[] since the SDK's full part union can't be expressed in Zod
  const messages = parseResult.data.messages as unknown as UIMessage[];

  // Load existing conversation or create a new one
  let conversation;
  if (conversationId) {
    conversation = await db.conversation.findFirst({
      where: { id: conversationId, userId: user.id, organizationId },
    });
    if (!conversation) {
      throw new HTTPException(404, { message: 'Conversation not found' });
    }
  } else {
    conversation = await db.conversation.create({
      data: { userId: user.id, organizationId },
    });
  }

  // Convert MCP tools to AI SDK tools (in-process, zero network overhead)
  const tools = toAISDKTools({
    accessToken: '',
    userId: user.id,
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
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  // Get existing message IDs for deduplication (avoids race conditions vs index-based slicing)
  const existingMessages = await db.message.findMany({
    where: { conversationId: conversation.id },
    select: { id: true },
  });
  const existingMessageIds = new Set(existingMessages.map((m) => m.id));

  // Get the Langfuse trace ID so we can pass it to the client for feedback scoring
  const traceId = ai.getRequestTraceId();

  // Return the streaming response with append-only persistence
  return streamResult.toUIMessageStreamResponse({
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
          conversationId: conversation.id,
          role: msg.role,
          parts: msg.parts as Prisma.InputJsonValue,
          // Store trace ID on assistant messages for feedback scoring
          traceId: msg.role === 'assistant' ? traceId : undefined,
        }));

        await db.message.createMany({ data: messageData });
      } catch (error) {
        log.error({ error, conversationId: conversation.id }, 'Failed to persist chat messages');
      }
    },
  });
});

export { chatApp };
