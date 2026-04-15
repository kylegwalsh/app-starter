'use client';

import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@orpc/client';
import { CHAT_ALLOWED_FILE_TYPES } from '@repo/constants';
import type { PromptInputMessage } from '@repo/design/components/ai-elements/prompt-input';
import { chatSchema } from '@repo/schemas';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatStatus, UIMessage } from 'ai';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { z } from 'zod';

import { client, orpc } from '@/core/orpc';

/** Our chat message type with typed metadata (traceId, feedback) */
type ChatMessageMetadata = z.infer<typeof chatSchema.messageMetadata>;
type ChatMessage = UIMessage<ChatMessageMetadata>;

type ChatContextValue = {
  messages: ChatMessage[];
  status: ChatStatus;
  error: Error | undefined;
  stop: () => void;
  regenerate: () => void;
  isLoading: boolean;
  isUploading: boolean;
  uploadError: string | null;
  conversationId: string | undefined;
  handleSubmit: (message: PromptInputMessage) => Promise<void>;
  submitFeedback: (messageId: string, rating: 'up' | 'down', comment?: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

/** sessionStorage key for a pending first message on a new conversation */
const pendingKey = (id: string) => `chat:pending:${id}`;

type ChatProviderProps = {
  /** Existing conversation ID (for loading a saved conversation) */
  conversationId?: string;
  /** Pre-loaded messages from the database */
  initialMessages?: ChatMessage[];
  children: ReactNode;
};

/** Uploads a FileUIPart's blob URL to S3 and returns a CDN file descriptor */
const uploadFilePart = async (
  filePart: PromptInputMessage['files'][number],
): Promise<{ type: 'file'; url: string; mediaType: string }> => {
  const resp = await fetch(filePart.url);
  const blob = await resp.blob();
  const file = new File([blob], filePart.filename ?? 'upload', { type: filePart.mediaType });

  const result = await orpc.uploads.createUploadUrl.call({
    fileName: file.name,
    fileType: file.type as (typeof CHAT_ALLOWED_FILE_TYPES)[number],
    fileSize: file.size,
  });

  const formData = new FormData();
  for (const [k, v] of Object.entries(result.uploadFields)) {
    formData.append(k, String(v));
  }
  formData.append('file', file);

  const res = await fetch(result.uploadUrl, { method: 'POST', body: formData });
  if (!res.ok) {
    throw new Error(`Failed to upload ${file.name}`);
  }

  return { type: 'file', url: result.cdnUrl, mediaType: file.type };
};

/** Provides chat state via useChat to all child components */
function ChatProvider({ conversationId, initialMessages, children }: ChatProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { messages, status, error, sendMessage, stop, regenerate } = useChat<ChatMessage>({
    transport: {
      async sendMessages(options) {
        // Use the prop conversationId, not options.chatId — the AI SDK generates
        // a random chatId when id is undefined, which the backend would reject as NOT_FOUND.
        const iterator = await client.chat.send(
          {
            id: conversationId,
            messages: options.messages as z.input<typeof chatSchema.chatMessage>['messages'],
          },
          { signal: options.abortSignal ?? undefined },
        );
        return eventIteratorToUnproxiedDataStream(iterator);
      },
      async reconnectToStream() {
        return null;
      },
    },
    id: conversationId,
    messages: initialMessages,
    messageMetadataSchema: chatSchema.messageMetadata,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // On mount, auto-send any pending message stored by the new-conversation flow.
  // The [id] page stores the user's first message in sessionStorage before navigating.
  useEffect(() => {
    if (!conversationId) {
      return;
    }
    const raw = sessionStorage.getItem(pendingKey(conversationId));
    if (!raw) {
      return;
    }
    sessionStorage.removeItem(pendingKey(conversationId));
    const { text, fileUrls } = JSON.parse(raw) as {
      text: string;
      fileUrls: { type: 'file'; url: string; mediaType: string }[];
    };
    if (fileUrls.length > 0) {
      sendMessage({ text, files: fileUrls });
    } else {
      sendMessage({ text });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [conversationId]);

  // After the first message is sent, invalidate the sidebar conversation list
  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      void queryClient.invalidateQueries({
        queryKey: orpc.chat.list.queryOptions({ input: { limit: 50 } }).queryKey,
      });
    }
  }, [status, messages.length, queryClient]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      setUploadError(null);

      if ((!message.text.trim() && message.files.length === 0) || isLoading || isUploading) {
        return;
      }

      // Upload files if any (common to both new and existing conversation paths)
      let fileUrls: { type: 'file'; url: string; mediaType: string }[] = [];
      if (message.files.length > 0) {
        setIsUploading(true);
        try {
          fileUrls = await Promise.all(message.files.map(uploadFilePart));
        } catch {
          setIsUploading(false);
          setUploadError('Failed to upload files. Please try again.');
          // Re-throw so PromptInput knows not to clear the form
          throw new Error('Upload failed');
        }
        setIsUploading(false);
      }

      // New conversation: generate an ID, stash the message, navigate to /chat/[id].
      // The [id] page reads the stashed message and auto-sends it on mount.
      if (!conversationId) {
        const id = nanoid();

        sessionStorage.setItem(pendingKey(id), JSON.stringify({ text: message.text, fileUrls }));

        // Optimistically add the new conversation to the sidebar list so it appears immediately
        queryClient.setQueryData(
          orpc.chat.list.queryOptions({ input: { limit: 50 } }).queryKey,
          (old) => ({
            items: [
              {
                id,
                title: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastMessageAt: null,
              },
              ...(old?.items ?? []),
            ],
            nextCursor: old?.nextCursor,
          }),
        );

        router.push(`/chat/${id}`);
        return;
      }

      // Existing conversation: send message with any uploaded file URLs
      if (fileUrls.length > 0) {
        sendMessage({ text: message.text, files: fileUrls });
      } else {
        sendMessage({ text: message.text });
      }
    },
    [conversationId, isLoading, isUploading, sendMessage, router, queryClient],
  );

  const submitFeedback = useCallback(
    (messageId: string, rating: 'up' | 'down', comment?: string) => {
      orpc.chat.submitFeedback.call({ messageId, rating, comment }).catch(() => {
        // Silent failure — feedback is non-critical
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      messages,
      status,
      error,
      stop,
      regenerate,
      isLoading,
      isUploading,
      uploadError,
      conversationId,
      handleSubmit,
      submitFeedback,
    }),
    [
      messages,
      status,
      error,
      stop,
      regenerate,
      isLoading,
      isUploading,
      uploadError,
      conversationId,
      handleSubmit,
      submitFeedback,
    ],
  );

  return <ChatContext value={value}>{children}</ChatContext>;
}

/** Access chat state from any child component */
const useChatContext = () => {
  const context = use(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export { ChatProvider, useChatContext, type ChatProviderProps, pendingKey };
