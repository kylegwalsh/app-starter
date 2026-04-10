'use client';

import { Button } from '@repo/design/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlusIcon, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { orpc } from '@/core/orpc';

const listQueryOptions = orpc.chat.list.queryOptions({ input: { limit: 50 } });

/** Sidebar listing all conversations with create/delete actions */
function ChatSidebar() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeId = params?.id as string | undefined;

  const { data } = useQuery(listQueryOptions);
  const deleteMutation = useMutation(orpc.chat.delete.mutationOptions());

  const handleDelete = async (conversationId: string) => {
    await deleteMutation.mutateAsync({ id: conversationId });
    queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey });
    // Only navigate away if we deleted the conversation we're currently viewing
    if (activeId === conversationId) {
      router.push('/chat');
    }
  };

  return (
    <div className="bg-muted/30 flex h-full w-64 flex-col border-r">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Chats</h2>
        <Button asChild size="icon" variant="ghost">
          <Link href="/chat">
            <MessageSquarePlusIcon className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2">
        {data?.items?.map((conversation) => (
          <div
            className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
              activeId === conversation.id
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
            key={conversation.id}
          >
            <Link className="flex-1 truncate" href={`/chat/${conversation.id}`}>
              {conversation.title ?? 'New conversation'}
            </Link>
            <Button
              className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete(conversation.id);
              }}
              size="icon"
              variant="ghost"
            >
              <TrashIcon className="text-muted-foreground size-3" />
            </Button>
          </div>
        ))}

        {data?.items?.length === 0 && (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            No conversations yet
          </p>
        )}
      </div>
    </div>
  );
}

export { ChatSidebar };
