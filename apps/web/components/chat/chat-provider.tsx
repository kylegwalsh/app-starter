'use client';

import { useChat } from '@ai-sdk/react';
import { eventIteratorToUnproxiedDataStream } from '@orpc/client';
import { CHAT_ALLOWED_FILE_TYPES } from '@repo/constants';
import {
  PromptInputProvider,
  useProviderAttachments,
  type PromptInputMessage,
} from '@repo/design/components/ai-elements/prompt-input';
import { chatSchema } from '@repo/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatStatus, UIMessage } from 'ai';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { z } from 'zod';

import { client, orpc } from '@/core/orpc';

/** Our chat message type with typed metadata (traceId, feedback) */
type ChatMessageMetadata = z.infer<typeof chatSchema.messageMetadata>;
type ChatMessage = UIMessage<ChatMessageMetadata>;

/**
 * Per-attachment upload status, keyed by the blob URL of the staged file.
 * Carries the CDN descriptor and a local blob URL on success so the renderer
 * can swap back to the in-memory preview for just-sent messages without a round
 * trip to re-fetch bytes we already uploaded.
 */
type AttachmentUploadState =
  | { status: 'uploading' }
  | { status: 'ready'; uploaded: UploadedFilePart; localPreviewUrl: string }
  | { status: 'error'; error: string };

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
  attachmentUploads: ReadonlyMap<string, AttachmentUploadState>;
  /** CDN URL → local blob URL, derived from attachmentUploads for instant render of just-sent files. */
  localPreviews: ReadonlyMap<string, string>;
  handleSubmit: (message: PromptInputMessage) => void;
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

type UploadedFilePart = {
  type: 'file';
  url: string;
  mediaType: string;
  filename: string;
};

/**
 * Typed error for S3 upload failures — keeps the S3 error code on the error object
 * so TanStack Query's `retry` predicate can decide whether to retry based on it.
 */
class UploadError extends Error {
  readonly code: string | undefined;
  readonly status: number;
  constructor(params: { message: string; code: string | undefined; status: number }) {
    super(params.message);
    this.name = 'UploadError';
    this.code = params.code;
    this.status = params.status;
  }
}

/**
 * Single-attempt upload: fetch the staged blob, presign via oRPC, POST to S3.
 * Throws `UploadError` with the parsed S3 code on failure so callers (or
 * `useMutation`'s retry) can react to specific codes.
 */
const uploadFilePart = async (
  filePart: PromptInputMessage['files'][number],
): Promise<{ uploaded: UploadedFilePart; localPreviewUrl: string }> => {
  const resp = await fetch(filePart.url);
  const blob = await resp.blob();
  const file = new File([blob], filePart.filename ?? 'upload', { type: filePart.mediaType });
  // Mint our own blob URL so the prompt input can safely revoke its copy
  // when the attachment strip clears after submit.
  const localPreviewUrl = URL.createObjectURL(blob);

  try {
    const presigned = await orpc.uploads.createUploadUrl.call({
      fileName: file.name,
      fileType: file.type as (typeof CHAT_ALLOWED_FILE_TYPES)[number],
      fileSize: file.size,
    });

    const formData = new FormData();
    for (const [k, v] of Object.entries(presigned.uploadFields)) {
      formData.append(k, String(v));
    }
    formData.append('file', file);

    const res = await fetch(presigned.uploadUrl, { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.text().catch(() => '<unreadable>');
      const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
      const message = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
      // eslint-disable-next-line no-console -- surfaces the underlying S3 reason in DevTools
      console.error('[chat upload] S3 rejected upload', {
        status: res.status,
        statusText: res.statusText,
        code,
        message,
        body,
        uploadUrl: presigned.uploadUrl,
        fileName: file.name,
      });
      throw new UploadError({
        status: res.status,
        code,
        message: `Failed to upload ${file.name}: ${code ?? res.status} — ${message ?? res.statusText}`,
      });
    }

    return {
      uploaded: { type: 'file', url: presigned.viewUrl, mediaType: file.type, filename: file.name },
      localPreviewUrl,
    };
  } catch (error) {
    // Don't leak the blob URL if the upload fails — retries will create a fresh one.
    URL.revokeObjectURL(localPreviewUrl);
    throw error;
  }
};

/** Outer wrapper — lifts the prompt input's attachments state so we can upload eagerly. */
function ChatProvider({ conversationId, initialMessages, children }: ChatProviderProps) {
  return (
    <PromptInputProvider>
      <ChatProviderInner conversationId={conversationId} initialMessages={initialMessages}>
        {children}
      </ChatProviderInner>
    </PromptInputProvider>
  );
}

/** Inner provider — owns chat state plus the per-attachment upload map. */
function ChatProviderInner({ conversationId, initialMessages, children }: ChatProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Single per-attachment state keyed by the staged file's blob URL — carries
  // both the upload status and (on success) the local blob URL so the renderer
  // can swap back for instant previews of just-sent files. Keyed by blob URL
  // because PromptInput strips the `id` field before onSubmit runs.
  const [attachmentUploads, setAttachmentUploads] = useState<Map<string, AttachmentUploadState>>(
    () => new Map(),
  );
  // Mirror of the latest map for cleanup and cross-effect dedupe without
  // retriggering effects on every upload state transition.
  const uploadsRef = useRef(attachmentUploads);
  uploadsRef.current = attachmentUploads;

  // Revoke any outstanding blob URLs we minted when the provider unmounts.
  useEffect(
    () => () => {
      for (const entry of uploadsRef.current.values()) {
        if (entry.status === 'ready') {
          URL.revokeObjectURL(entry.localPreviewUrl);
        }
      }
    },
    [],
  );

  const { files: stagedFiles } = useProviderAttachments();

  // TanStack Query drives the upload: retry handles the transient
  // SignatureDoesNotMatch race we see when SST rotates Lambda STS credentials
  // between signing and delivery.
  const uploadMutation = useMutation({
    mutationFn: uploadFilePart,
    retry: (failureCount, error) =>
      failureCount < 2 && error instanceof UploadError && error.code === 'SignatureDoesNotMatch',
    retryDelay: 0,
  });

  // Kick off an S3 upload the moment a file is staged; drop state + revoke the
  // preview URL for files the user removes. Runs only when the staged-file list
  // changes (add/remove), not on every upload state transition.
  useEffect(() => {
    const currentUrls = new Set(stagedFiles.map((f) => f.url));

    setAttachmentUploads((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [url, entry] of prev) {
        if (!currentUrls.has(url)) {
          if (entry.status === 'ready') {
            URL.revokeObjectURL(entry.localPreviewUrl);
          }
          next.delete(url);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    for (const file of stagedFiles) {
      if (uploadsRef.current.has(file.url)) {
        continue;
      }
      // Write to the ref immediately so a burst of renders during the same tick
      // doesn't double-mutate for the same file before React commits the state.
      uploadsRef.current = new Map(uploadsRef.current).set(file.url, { status: 'uploading' });
      setAttachmentUploads((prev) => new Map(prev).set(file.url, { status: 'uploading' }));
      void (async () => {
        try {
          const { uploaded, localPreviewUrl } = await uploadMutation.mutateAsync(file);
          setAttachmentUploads((prev) => {
            if (!prev.has(file.url)) {
              // File removed mid-upload; don't resurrect the entry and don't leak the URL.
              URL.revokeObjectURL(localPreviewUrl);
              return prev;
            }
            return new Map(prev).set(file.url, { status: 'ready', uploaded, localPreviewUrl });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          setAttachmentUploads((prev) => {
            if (!prev.has(file.url)) {
              return prev;
            }
            return new Map(prev).set(file.url, { status: 'error', error: errorMessage });
          });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uploadMutation is stable; we only react to staged-file changes
  }, [stagedFiles]);

  // CDN URL → local blob URL lookup derived from the single source of truth.
  const localPreviews = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of attachmentUploads.values()) {
      if (entry.status === 'ready') {
        map.set(entry.uploaded.url, entry.localPreviewUrl);
      }
    }
    return map;
  }, [attachmentUploads]);

  const isUploading = useMemo(
    () => Array.from(attachmentUploads.values()).some((u) => u.status === 'uploading'),
    [attachmentUploads],
  );

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
    // Backend emits a transient `data-conversation-title` event when the AI-
    // generated title resolves; patch the sidebar cache so the new title shows
    // up without a list refetch.
    onData: (dataPart) => {
      if (dataPart.type !== 'data-conversation-title' || !conversationId) {
        return;
      }
      const { title } = (dataPart as { data: { title: string } }).data;
      queryClient.setQueryData(
        orpc.chat.list.queryOptions({ input: { limit: 50 } }).queryKey,
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((c) => (c.id === conversationId ? { ...c, title } : c)),
              }
            : old,
      );
    },
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
      fileUrls: UploadedFilePart[];
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
    (message: PromptInputMessage) => {
      setUploadError(null);

      if ((!message.text.trim() && message.files.length === 0) || isLoading) {
        return;
      }

      // Look up each staged file's pre-uploaded CDN descriptor. Uploads started the
      // moment the file was attached, so by submit time they should all be `ready`.
      const fileUrls: UploadedFilePart[] = [];
      for (const file of message.files) {
        const entry = attachmentUploads.get(file.url);
        if (!entry || entry.status === 'uploading') {
          // Shouldn't happen because the submit button is disabled while uploads
          // are in flight, but bail out safely rather than dropping the file.
          setUploadError('Still uploading — please wait.');
          return;
        }
        if (entry.status === 'error') {
          setUploadError(`Upload failed: ${entry.error}. Remove the file and try again.`);
          return;
        }
        fileUrls.push(entry.uploaded);
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
    [attachmentUploads, conversationId, isLoading, sendMessage, router, queryClient],
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
      attachmentUploads,
      localPreviews,
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
      attachmentUploads,
      localPreviews,
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
