'use client';

import { useChat } from '@ai-sdk/react';
import { config } from '@repo/config';
import { CHAT_ALLOWED_FILE_TYPES, CHAT_MAX_FILE_SIZE } from '@repo/constants';
import { chatSchema } from '@repo/schemas';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type { z } from 'zod';

import { orpc } from '@/core/orpc';

/** Our chat message type with typed metadata (traceId, feedback) */
type ChatMessageMetadata = z.infer<typeof chatSchema.messageMetadata>;
type ChatMessage = UIMessage<ChatMessageMetadata>;

/** A file attached to a message before sending */
type AttachedFile = {
  file: File;
  previewUrl: string;
};

type ChatContextValue = {
  messages: ChatMessage[];
  status: string;
  error: Error | undefined;
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: FormEvent) => void;
  stop: () => void;
  regenerate: () => void;
  isLoading: boolean;
  isUploading: boolean;
  uploadError: string | null;
  conversationId: string | undefined;
  attachedFiles: AttachedFile[];
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  submitFeedback: (messageId: string, rating: 'up' | 'down', comment?: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

type ChatProviderProps = {
  /** Existing conversation ID (for loading a saved conversation) */
  conversationId?: string;
  /** Pre-loaded messages from the database */
  initialMessages?: ChatMessage[];
  children: ReactNode;
};

/** Provides chat state via useChat to all child components */
function ChatProvider({ conversationId, initialMessages, children }: ChatProviderProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const file of attachedFiles) {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      }
    };
  }, [attachedFiles]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${config.api.url}/api/chat`,
        credentials: 'include',
      }),
    [],
  );

  const { messages, status, error, sendMessage, stop, regenerate } = useChat<ChatMessage>({
    transport,
    id: conversationId,
    messages: initialMessages,
    messageMetadataSchema: chatSchema.messageMetadata,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const addFiles = useCallback((files: File[]) => {
    const allowedTypes = new Set<string>(CHAT_ALLOWED_FILE_TYPES);

    const validFiles: AttachedFile[] = [];
    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        setUploadError(`"${file.name}" is not a supported file type.`);
        continue;
      }
      if (file.size > CHAT_MAX_FILE_SIZE) {
        setUploadError(`"${file.name}" exceeds the 10MB size limit.`);
        continue;
      }
      validFiles.push({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      });
    }

    if (validFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => {
      const file = prev[index];
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setUploadError(null);

      if ((!input.trim() && attachedFiles.length === 0) || isLoading || isUploading) {
        return;
      }

      // Upload files if any are attached
      let fileUrls: { type: 'file'; url: string; mediaType: string }[] = [];
      if (attachedFiles.length > 0) {
        setIsUploading(true);
        try {
          fileUrls = await Promise.all(
            attachedFiles.map(async (attached) => {
              const result = await orpc.uploads.createUploadUrl.call({
                fileName: attached.file.name,
                // Safe cast — file type was validated in addFiles
                fileType: attached.file.type as (typeof CHAT_ALLOWED_FILE_TYPES)[number],
                fileSize: attached.file.size,
              });

              // Upload via presigned POST (FormData) — enforces content-length-range at S3 level
              const formData = new FormData();
              for (const [fieldKey, fieldValue] of Object.entries(result.uploadFields)) {
                formData.append(fieldKey, String(fieldValue));
              }
              formData.append('file', attached.file);

              const uploadResponse = await fetch(result.uploadUrl, {
                method: 'POST',
                body: formData,
              });

              if (!uploadResponse.ok) {
                throw new Error(`Failed to upload ${attached.file.name}`);
              }

              return {
                type: 'file' as const,
                url: result.cdnUrl as string,
                mediaType: attached.file.type,
              };
            }),
          );
        } catch {
          setIsUploading(false);
          setUploadError('Failed to upload files. Please try again.');
          return; // Don't clear files — let user retry
        }
        setIsUploading(false);
      }

      // Clean up preview URLs
      for (const attached of attachedFiles) {
        if (attached.previewUrl) {
          URL.revokeObjectURL(attached.previewUrl);
        }
      }
      setAttachedFiles([]);

      // Send message with optional file attachments
      if (fileUrls.length > 0) {
        sendMessage({ text: input, files: fileUrls });
      } else {
        sendMessage({ text: input });
      }
      setInput('');
    },
    [input, attachedFiles, isLoading, isUploading, sendMessage],
  );

  const submitFeedback = useCallback(
    (messageId: string, rating: 'up' | 'down', comment?: string) => {
      orpc.conversations.submitFeedback.call({ messageId, rating, comment }).catch(() => {
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
      input,
      setInput,
      handleSubmit,
      stop,
      regenerate,
      isLoading,
      isUploading,
      uploadError,
      conversationId,
      attachedFiles,
      addFiles,
      removeFile,
      submitFeedback,
    }),
    [
      messages,
      status,
      error,
      input,
      handleSubmit,
      stop,
      regenerate,
      isLoading,
      isUploading,
      uploadError,
      conversationId,
      attachedFiles,
      addFiles,
      removeFile,
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

export { ChatProvider, useChatContext, type ChatProviderProps };
