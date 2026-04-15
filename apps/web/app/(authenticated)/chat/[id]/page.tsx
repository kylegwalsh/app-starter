'use client';

import { Skeleton } from '@repo/design/components/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { ChatProvider } from '@/components/chat/chat-provider';
import { ChatView } from '@/components/chat/chat-view';
import { orpc } from '@/core/orpc';

/** Existing conversation page — loads messages from the database */
export default function ChatConversationPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isFetched } = useQuery({
    ...orpc.chat.get.queryOptions({ input: { id } }),
    // A client-generated ID won't exist in the DB until the first message is sent.
    // Treat 404 as "new conversation" rather than an error state.
    retry: (_, error) => {
      const e = error as { code?: string };
      return e.code !== 'NOT_FOUND';
    },
  });

  // Use isFetched (not isLoading) so navigating away and back doesn't re-show
  // the skeleton when the data is already cached in the QueryClient.
  if (!isFetched) {
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
