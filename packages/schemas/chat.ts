import { CHAT_ALLOWED_FILE_TYPES, CHAT_MAX_FILE_SIZE } from '@repo/constants';
import { z } from 'zod';

/** Chat-related schemas shared between frontend and backend */
export const chatSchema = {
  /** Schema for the file upload request */
  uploadInput: z.object({
    /** Original file name */
    fileName: z.string().min(1),
    /** MIME type of the file */
    fileType: z.enum(CHAT_ALLOWED_FILE_TYPES),
    /** File size in bytes */
    fileSize: z.number().int().positive().max(CHAT_MAX_FILE_SIZE),
  }),

  /** Schema for message feedback (thumbs up/down + optional comment) */
  feedback: z.object({
    /** The message ID to submit feedback for */
    messageId: z.string(),
    /** Thumbs up or down */
    rating: z.enum(['up', 'down']),
    /** Optional comment about how the response could be improved */
    comment: z.string().max(1000).optional(),
  }),

  /** Schema for message metadata — flows through the stream and persists with the message */
  messageMetadata: z.object({
    traceId: z.string().optional(),
    feedback: z.boolean().optional(),
    /** True if this assistant message was stopped by the user mid-stream. */
    cancelled: z.boolean().optional(),
    /** True if the assistant response errored out before persisting normally. */
    errored: z.boolean().optional(),
  }),

  /** Schema for cancelling a chat — `partial` is the in-progress assistant message to persist alongside the cancellation marker */
  cancel: z.object({
    id: z.string(),
    partial: z
      .object({
        id: z.string(),
        parts: z.array(z.object({ type: z.string() }).passthrough()),
      })
      .optional(),
  }),

  /** Schema for the chat message input (validated on the backend) */
  chatMessage: z.object({
    id: z.string().optional(),
    messages: z.array(
      z
        .object({
          id: z.string(),
          role: z.enum(['user', 'assistant', 'system']),
          parts: z.array(z.object({ type: z.string() }).passthrough()),
        })
        .passthrough(),
    ),
    /**
     * When true, signals that this send is a "Try again" on a prior errored
     * response. The backend deletes only the latest errored shell so a reload
     * after a successful retry doesn't show the dead-end alongside the new
     * response.
     */
    isRetry: z.boolean().optional(),
  }),
};
