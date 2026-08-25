'use client';

import { Skeleton } from '@repo/design/components/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ChatProvider, pendingKey, type ChatMessage } from '@/components/chat/chat-provider';
import { ChatView } from '@/components/chat/chat-view';
import { api } from '@/core/api';

/** Existing conversation page — loads messages from the database */
const ChatConversationPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Snapshot at mount: if /chat staged a pending message under this id, the
  // row won't exist in the DB until that message lands. Skip the fetch so we
  // don't emit a guaranteed-404 right before sendMessage creates the row.
  const [hasPendingMessage] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(pendingKey(id)) !== null,
  );

  const { data, isFetched, error } = useQuery({
    ...api.chat.conversations[':id'].$get.queryOptions({ param: { id } }),
    enabled: !hasPendingMessage,
    // Late-typed IDs (existing conversations) shouldn't auto-retry on 404 —
    // we treat it as a stale URL and bounce below.
    retry: (_, retryError) => !retryError.isNotFound(),
  });

  // 404 with no pending message means the URL is stale (conversation deleted,
  // wrong stage, hand-typed bad ID). Show a toast and bounce to /chat.
  const shouldRedirect = isFetched && Boolean(error?.isNotFound()) && !hasPendingMessage;

  useEffect(() => {
    if (!shouldRedirect) {
      return;
    }
    toast.error(`Unable to load conversation ${id}`);
    router.replace('/chat');
  }, [shouldRedirect, id, router]);

  // Use isFetched (not isLoading) so navigating away and back doesn't re-show
  // the skeleton when the data is already cached in the QueryClient.
  // Pending-message mounts go straight to ChatProvider — there's nothing to fetch.
  if ((!hasPendingMessage && !isFetched) || shouldRedirect) {
    return (
      // Mirrors the real conversation layout: outer flex column matches
      // <Conversation>, inner column matches <ConversationContent>'s padding +
      // gap, then alternating user-bubble (right) and assistant-text (left)
      // skeletons. Widths are varied to read as natural prose rather than a
      // uniform stack.
      <div className="flex h-full w-full flex-col">
        <div className="flex flex-1 flex-col gap-4 px-4 py-6">
          {/* User — multi-line question */}
          <div className="flex justify-end">
            <Skeleton className="h-14 w-[22rem] max-w-[80%] rounded-2xl rounded-br-lg" />
          </div>

          {/* Assistant — multi-paragraph response */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-[94%]" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-[82%]" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-[88%]" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>

          {/* User — short follow-up */}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-44 rounded-2xl rounded-br-lg" />
          </div>

          {/* Assistant — medium response */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-[91%]" />
            <Skeleton className="h-5 w-3/4" />
          </div>

          {/* User — medium question */}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-60 rounded-2xl rounded-br-lg" />
          </div>

          {/* Assistant — short response */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // The wire type can't express the AI SDK's `UIMessage` part union (the same
  // reason the backend casts when validating it with Zod), and asking TypeScript
  // to reconcile the two blows the instantiation depth limit. The shapes match.
  const initialMessages = data?.messages as ChatMessage[] | undefined;

  return (
    <ChatProvider
      conversationId={id}
      initialMessages={initialMessages}
      initialGeneratingUntil={data?.generatingUntil}
    >
      <ChatView />
    </ChatProvider>
  );
};

export default ChatConversationPage;
