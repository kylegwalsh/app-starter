'use client';

import { Skeleton } from '@repo/design/components/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { ChatProvider, pendingKey } from '@/components/chat/chat-provider';
import { ChatView } from '@/components/chat/chat-view';
import { orpc } from '@/core/orpc';

/** Existing conversation page — loads messages from the database */
export default function ChatConversationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isFetched, error } = useQuery({
    ...orpc.chat.get.queryOptions({ input: { id } }),
    // A client-generated ID won't exist in the DB until the first message is sent.
    // Treat 404 as "new conversation" rather than an error state.
    retry: (_, retryError) => {
      const e = retryError as { code?: string };
      return e.code !== 'NOT_FOUND';
    },
  });

  // 404 with no pending message means the URL is stale (conversation deleted,
  // wrong stage, hand-typed bad ID). Show a toast and bounce to /chat.
  const errorCode = (error as { code?: string } | null)?.code;
  const isNotFound = errorCode === 'NOT_FOUND';
  const hasPendingMessage =
    typeof window !== 'undefined' && sessionStorage.getItem(pendingKey(id)) !== null;
  const shouldRedirect = isFetched && isNotFound && !hasPendingMessage;

  useEffect(() => {
    if (!shouldRedirect) {
      return;
    }
    toast.error(`Unable to load conversation ${id}`);
    router.replace('/chat');
  }, [shouldRedirect, id, router]);

  // Use isFetched (not isLoading) so navigating away and back doesn't re-show
  // the skeleton when the data is already cached in the QueryClient.
  if (!isFetched || shouldRedirect) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <ChatProvider conversationId={id} initialMessages={data?.messages}>
      <ChatView />
    </ChatProvider>
  );
}
