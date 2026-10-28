'use client';

import { Chat, useChat } from '@ai-sdk/react';
import { PromptInputProvider, type PromptInputMessage } from '@repo/design';
import { chatSchema } from '@repo/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { ApiError } from 'hono-tanstack-query';
import { nanoid } from 'nanoid';
import { usePathname, useRouter } from 'next/navigation';
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
import { toast } from 'sonner';

import { chatListQueryKey, conversationListCache } from '@/hooks/use-conversations';
import { api, apiUrl, client } from '@/lib/api';
import { auth } from '@/lib/auth';

import { getUploadedFile } from './chat-uploads';
import type { ChatMessage } from './chat-utils';

/** How often to check on a response that's generating elsewhere (e.g. another tab) */
const GENERATION_POLL_MS = 3000;

/** A saved conversation with its messages, as returned by the API */
type SavedConversation = (typeof api.chat.conversations)[':id']['$get']['$infer']['data'];

/** The conversation currently shown in the full-screen chat or the drawer */
type ActiveConversation = {
  /** Undefined until the first message of a new conversation is sent */
  conversationId: string | undefined;
  chat: Chat<ChatMessage>;
  /** A response is generating elsewhere; we poll until it's saved */
  isWaiting: boolean;
};

type ChatContextValue = {
  chat: Chat<ChatMessage>;
  conversationId: string | undefined;
  isWaiting: boolean;
  /** The saved conversation being loaded, if any (views show a skeleton until it's ready) */
  loadingConversationId: string | undefined;
  /** Uploaded file URL → local blob URL, so just-sent files render without a round trip */
  localPreviews: ReadonlyMap<string, string>;
  sendMessage: (message: PromptInputMessage) => void;
  stop: () => void;
  /** Shows a blank new conversation (no-op if one is already showing) */
  startNewConversation: () => void;
  /** Loads a saved conversation and shows it */
  openConversation: (conversationId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

/** App-wide chat state, mounted in the authenticated layout so conversations survive navigation */
export const ChatProvider: FC<{ children: ReactNode }> = ({ children }) => (
  // Lifted so staged attachments (and their uploads) survive moving between the drawer and page
  <PromptInputProvider>
    <ChatProviderInner>{children}</ChatProviderInner>
  </PromptInputProvider>
);

const ChatProviderInner: FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [localPreviews, setLocalPreviews] = useState<ReadonlyMap<string, string>>(new Map());
  // Points at `reconnect` below (chats are created before it's defined)
  const reconnectRef = useRef<(conversationId: string) => void>(() => {});

  /** Creates the chat for one conversation */
  const createChat = useCallback(
    (conversationId?: string, messages?: ChatMessage[]) =>
      // Created here (not by `useChat`, which stops chats it created on unmount) so streams
      // survive moving between the full-screen chat and the drawer
      new Chat<ChatMessage>({
        id: conversationId,
        messages,
        messageMetadataSchema: chatSchema.messageMetadata,
        dataPartSchemas: chatSchema.dataParts,
        transport: new DefaultChatTransport<ChatMessage>({
          api: `${apiUrl}/chat`,
          credentials: 'include',
          // The server owns the history, so send only the message to answer (on a retry, the
          // last user message)
          prepareSendMessagesRequest: ({ messages: outgoing }) => ({
            body: { id: conversationId, message: outgoing.at(-1) },
          }),
          // A 409 means another tab is already generating here, so wait for that response
          fetch: async (input, init) => {
            const res = await fetch(input, init);
            if (res.status === 409 && conversationId) {
              reconnectRef.current(conversationId);
            }
            return res;
          },
        }),
        // Show a new conversation's AI title in the sidebar as soon as it arrives, mid-stream
        onData: (part) => {
          if (part.type !== 'data-conversation-title' || !conversationId) {
            return;
          }
          conversationListCache.updateItems(queryClient, (items) =>
            items.map((c) => (c.id === conversationId ? { ...c, title: part.data.title } : c)),
          );
        },
        // Refetch the sidebar once a response settles, picking up its new order
        onFinish: () => queryClient.invalidateQueries({ queryKey: chatListQueryKey }),
      }),
    [queryClient],
  );

  const [active, setActive] = useState<ActiveConversation>(() => ({
    conversationId: undefined,
    // A blank chat never sends (the first message creates the conversation's own chat)
    chat: new Chat<ChatMessage>({}),
    isWaiting: false,
  }));
  // Mirror of the active conversation so the actions below read the latest one, and stay
  // idempotent when called twice before React re-renders (e.g. StrictMode effects)
  const activeRef = useRef(active);

  /** Switches the active conversation, stopping the one we leave */
  const activate = useCallback((next: ActiveConversation) => {
    // The server keeps generating it, and reopening the conversation waits for it to land
    activeRef.current.chat.stop();
    activeRef.current = next;
    setActive(next);
  }, []);

  // The conversation being loaded; a load that's no longer the latest is ignored when it resolves
  const [loadingConversationId, setLoadingConversationId] = useState<string>();
  const loadingIdRef = useRef<string>(undefined);

  /** Sets (or clears) the conversation being loaded */
  const setLoading = useCallback((id: string | undefined) => {
    loadingIdRef.current = id;
    setLoadingConversationId(id);
  }, []);

  const startNewConversation = useCallback(() => {
    setLoading(undefined);
    const { conversationId, chat } = activeRef.current;
    if (!conversationId && chat.messages.length === 0) {
      return;
    }
    activate({ conversationId: undefined, chat: createChat(), isWaiting: false });
  }, [activate, createChat, setLoading]);

  /** Fetches a saved conversation fresh (concurrent fetches of it share one request) */
  const fetchConversation = useCallback(
    (id: string) =>
      queryClient.fetchQuery({
        ...api.chat.conversations[':id'].$get.queryOptions({ param: { id } }),
        staleTime: 0,
        // A missing or forbidden conversation won't load on a retry, so fail fast to redirect
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof ApiError && error.isClientError()),
      }),
    [queryClient],
  );

  /** Shows a saved conversation; if its response is still generating, polls until it's saved */
  const showConversation = useCallback(
    (id: string, saved: SavedConversation) => {
      const show = (current: SavedConversation) => {
        // The wire type can't express the AI SDK's `UIMessage` part union; the shapes match
        const chat = createChat(id, current.messages as ChatMessage[]);
        activate({ conversationId: id, chat, isWaiting: current.isGenerating });
        if (!current.isGenerating) {
          return;
        }
        setTimeout(async () => {
          const latest = await fetchConversation(id).catch(() => current);
          // Stop once the user has moved on to another conversation
          if (activeRef.current.chat === chat) {
            show(latest);
          }
        }, GENERATION_POLL_MS);
      };
      show(saved);
    },
    [activate, createChat, fetchConversation],
  );

  const openConversation = useCallback(
    async (id: string) => {
      if (activeRef.current.conversationId === id) {
        setLoading(undefined);
        return;
      }
      setLoading(id);
      try {
        const saved = await fetchConversation(id);
        // The user picked something else while this loaded
        if (loadingIdRef.current !== id) {
          return;
        }
        showConversation(id, saved);
        setLoading(undefined);
      } catch (error) {
        if (loadingIdRef.current === id) {
          setLoading(undefined);
          throw error;
        }
      }
    },
    [fetchConversation, setLoading, showConversation],
  );

  /** Reloads a conversation another tab is generating in, and waits for that response */
  const reconnect = useCallback(
    async (id: string) => {
      toast.info(
        'A response is already being generated in another tab, so your message wasn’t sent.',
      );
      const saved = await fetchConversation(id).catch(() => {});
      if (saved && activeRef.current.conversationId === id) {
        showConversation(id, saved);
      }
    },
    [fetchConversation, showConversation],
  );
  useEffect(() => {
    reconnectRef.current = (id) => reconnect(id);
  }, [reconnect]);

  // Conversations belong to an organization, so switching organizations starts a new one
  const activeOrganizationId = auth.useSession().data?.session.activeOrganizationId;
  const organizationRef = useRef(activeOrganizationId);
  useEffect(() => {
    if (organizationRef.current === activeOrganizationId) {
      return;
    }
    organizationRef.current = activeOrganizationId;
    startNewConversation();
  }, [activeOrganizationId, startNewConversation]);

  const sendMessage = useCallback(
    (message: PromptInputMessage) => {
      const current = activeRef.current;
      const isBusy = current.chat.status === 'submitted' || current.chat.status === 'streaming';
      if ((!message.text.trim() && message.files.length === 0) || isBusy || current.isWaiting) {
        return;
      }

      // Attachments upload as soon as they're staged (sending is disabled until they finish)
      const uploads = message.files.map((file) => getUploadedFile(queryClient, file));
      const files = uploads.filter((upload) => upload !== undefined);
      if (files.length < uploads.length) {
        toast.error('Some attachments failed to upload. Remove them and try again.');
        return;
      }
      setLocalPreviews((previews) => {
        const next = new Map(previews);
        for (const { part, blob } of files) {
          next.set(part.url, URL.createObjectURL(blob));
        }
        return next;
      });

      let { chat } = current;
      if (!current.conversationId) {
        // A new conversation: the client picks its ID and the server creates it on first send
        const conversationId = nanoid();
        chat = createChat(conversationId);
        activate({ conversationId, chat, isWaiting: false });
        const now = new Date().toISOString();
        conversationListCache.prepend(queryClient, {
          id: conversationId,
          title: null,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: null,
        });
        // The full-screen chat moves to the conversation's URL; the drawer stays where it is
        if (pathname === '/chat') {
          router.push(`/chat/${conversationId}`);
        }
      }
      chat.sendMessage({ text: message.text, files: files.map(({ part }) => part) });
    },
    [activate, createChat, pathname, queryClient, router],
  );

  const stop = useCallback(async () => {
    const { chat, conversationId } = activeRef.current;
    await chat.stop();
    if (!conversationId) {
      return;
    }

    // Keep what the user saw, marked as stopped (an empty reply if nothing had streamed yet)
    const last = chat.messages.at(-1);
    const partial: ChatMessage =
      last?.role === 'assistant' ? last : { id: nanoid(), role: 'assistant', parts: [] };
    chat.messages = [
      ...chat.messages.filter((m) => m.id !== partial.id),
      { ...partial, metadata: { ...partial.metadata, cancelled: true } },
    ];

    // Best-effort: the server saves the same partial, so a reload shows what the user saw
    await client.chat.conversations[':id'].cancel
      .$post({ param: { id: conversationId }, json: { partial } })
      .catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      chat: active.chat,
      conversationId: active.conversationId,
      isWaiting: active.isWaiting,
      loadingConversationId,
      localPreviews,
      sendMessage,
      stop: () => stop(),
      startNewConversation,
      openConversation,
    }),
    [
      active,
      loadingConversationId,
      localPreviews,
      sendMessage,
      stop,
      startNewConversation,
      openConversation,
    ],
  );

  return <ChatContext value={value}>{children}</ChatContext>;
};

/** Access chat state from any child component */
export const useChatContext = () => {
  const context = use(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

/** Subscribes to the active conversation's messages and status */
export const useActiveChat = () => {
  const { chat } = useChatContext();
  return useChat<ChatMessage>({ chat });
};
