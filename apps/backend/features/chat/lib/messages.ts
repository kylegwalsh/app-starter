import type { Message } from '@prisma/client';
import type { UIMessage } from 'ai';

import { db } from '@/db';

/** Converts a stored message row into an AI SDK UI message */
export const toUIMessage = (message: Message): UIMessage => ({
  id: message.id,
  role: message.role as UIMessage['role'],
  parts: message.parts as unknown as UIMessage['parts'],
});

/** Loads a conversation's stored messages, oldest first */
export const loadMessages = (conversationId: string) =>
  db.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
