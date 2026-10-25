'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Skeleton,
} from '@repo/design/components/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2Icon, PlusIcon, MoreHorizontalIcon, PencilIcon, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  chatListQueryKey,
  useConversations,
  type ConversationListInfiniteData,
  type ConversationListPage,
} from '@/hooks/use-conversations';
import { api } from '@/lib/api';

/** A conversation row as returned by the list endpoint (dates arrive as ISO strings) */
type Conversation = ConversationListPage['items'][number];

type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
};

/** Placeholder row shown while the title is generating or the whole list is loading */
const ConversationItemSkeleton = () => (
  <div className="h-9 w-full shrink-0">
    <Skeleton className="h-8 shrink-0 rounded-md" />
  </div>
);

/** Single conversation row with inline rename and delete via ellipsis menu */
const ConversationItem: FC<ConversationItemProps> = ({ conversation, isActive }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title ?? '');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const renameMutation = useMutation({
    ...api.chat.conversations[':id'].$patch.mutationOptions(),
    onMutate: async ({ param, json }) => {
      await queryClient.cancelQueries({ queryKey: chatListQueryKey });
      const previous = queryClient.getQueryData(chatListQueryKey);
      queryClient.setQueryData<ConversationListInfiniteData>(chatListQueryKey, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((c) => (c.id === param.id ? { ...c, title: json.title } : c)),
              })),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(chatListQueryKey, ctx.previous);
      }
      toast.error('Failed to rename conversation');
    },
    // No invalidation — the optimistic update already has the correct title and
    // order. Invalidating would re-sort by lastMessageAt and jump the item.
  });

  const deleteMutation = useMutation({
    ...api.chat.conversations[':id'].$delete.mutationOptions(),
    onMutate: async ({ param }) => {
      await queryClient.cancelQueries({ queryKey: chatListQueryKey });
      const previous = queryClient.getQueryData(chatListQueryKey);
      queryClient.setQueryData<ConversationListInfiniteData>(chatListQueryKey, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.filter((c) => c.id !== param.id),
              })),
            }
          : old,
      );
      if (isActive) {
        router.push('/chat');
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(chatListQueryKey, ctx.previous);
      }
      toast.error('Failed to delete conversation');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatListQueryKey });
    },
  });

  // Focus the input after Radix finishes restoring focus to the dropdown trigger
  useEffect(() => {
    if (!isRenaming) {
      return;
    }
    // Double rAF: first frame lets React commit the input to the DOM,
    // second frame runs after Radix's focus-restoration microtask completes.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isRenaming]);

  const startRename = () => {
    setRenameValue(conversation.title ?? '');
    setIsRenaming(true);
  };

  const commitRename = () => {
    setIsRenaming(false);
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      renameMutation.mutate({ param: { id: conversation.id }, json: { title: trimmed } });
    }
  };

  const isWorking = deleteMutation.isPending || renameMutation.isPending;

  // Stay loading until the title is generated
  if (!conversation.title) {
    return <ConversationItemSkeleton />;
  }

  return (
    <>
      <div
        className={`group flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-sm transition-colors ${
          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        }`}
      >
        {isRenaming ? (
          <Input
            className="h-6 flex-1 px-1 text-sm"
            onBlur={commitRename}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitRename();
              }
              if (e.key === 'Escape') {
                setIsRenaming(false);
              }
            }}
            ref={inputRef}
            value={renameValue}
          />
        ) : (
          <Link className="min-w-0 flex-1" href={`/chat/${conversation.id}`}>
            <span className="block truncate">{conversation.title}</span>
          </Link>
        )}

        {isWorking && (
          <Loader2Icon className="text-muted-foreground size-3 shrink-0 animate-spin" />
        )}
        {!isWorking && !isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="hidden size-6 shrink-0 group-hover:inline-flex data-[state=open]:inline-flex"
                size="icon"
                variant="ghost"
              >
                <MoreHorizontalIcon className="text-muted-foreground size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(e) => {
                // Stop Radix from focusing the trigger — the input will take focus instead.
                if (isRenaming) {
                  e.preventDefault();
                }
              }}
              side="right"
            >
              <DropdownMenuItem onSelect={startRename}>
                <PencilIcon className="mr-2 size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirmDeleteOpen(true)}
              >
                <TrashIcon className="mr-2 size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog onOpenChange={setConfirmDeleteOpen} open={confirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              {conversation.title
                ? `"${conversation.title}" will be permanently deleted.`
                : 'This conversation will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => deleteMutation.mutate({ param: { id: conversation.id } })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/** Scroll-progress threshold (0–1) at which to fetch the next page — 0.75 = 25% remaining */
const NEXT_PAGE_TRIGGER_RATIO = 0.75;

/** Sidebar listing all conversations with create/delete actions */
export const ChatSidebar = () => {
  const { id: activeId } = useParams<{ id?: string }>();
  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useConversations();

  // Flatten paginated results into a single list for rendering
  const conversations = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages],
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    const el = e.currentTarget;
    // Trigger when the user has scrolled past 90% of the content (only 10% remains below)
    if (el.scrollTop + el.clientHeight >= el.scrollHeight * NEXT_PAGE_TRIGGER_RATIO) {
      void fetchNextPage();
    }
  };

  return (
    <div className="bg-muted/30 flex h-full w-64 flex-col border-r">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Chats</h2>
        <Button asChild size="icon" variant="ghost">
          <Link href="/chat">
            <PlusIcon className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" onScroll={handleScroll}>
        {isPending && Array.from({ length: 10 }, (_, i) => <ConversationItemSkeleton key={i} />)}

        {conversations.map((conversation) => (
          <ConversationItem
            conversation={conversation}
            isActive={activeId === conversation.id}
            key={conversation.id}
          />
        ))}

        {/* Loading placeholders while fetching the next page */}
        {isFetchingNextPage &&
          Array.from({ length: 3 }, (_, i) => <ConversationItemSkeleton key={`next-${i}`} />)}

        {!isPending && conversations.length === 0 && (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            No conversations yet
          </p>
        )}
      </div>
    </div>
  );
};
