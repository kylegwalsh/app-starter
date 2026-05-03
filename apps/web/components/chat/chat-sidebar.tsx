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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2Icon,
  MessageSquarePlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { orpc } from '@/core/orpc';

const listQueryOptions = orpc.chat.list.queryOptions({ input: { limit: 50 } });

type Conversation = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
};

/** Single conversation row with inline rename and delete via ellipsis menu */
function ConversationItem({ conversation, isActive }: ConversationItemProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title ?? '');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  type ListData = Awaited<ReturnType<typeof listQueryOptions.queryFn>>;

  const renameMutation = useMutation({
    ...orpc.chat.updateTitle.mutationOptions(),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: listQueryOptions.queryKey });
      const previous = queryClient.getQueryData(listQueryOptions.queryKey);
      queryClient.setQueryData<ListData>(listQueryOptions.queryKey, (old) =>
        old ? { ...old, items: old.items.map((c) => (c.id === id ? { ...c, title } : c)) } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(listQueryOptions.queryKey, ctx.previous);
      }
      toast.error('Failed to rename conversation');
    },
    // No invalidation — the optimistic update already has the correct title and
    // order. Invalidating would re-sort by lastMessageAt and jump the item.
  });

  const deleteMutation = useMutation({
    ...orpc.chat.delete.mutationOptions(),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: listQueryOptions.queryKey });
      const previous = queryClient.getQueryData(listQueryOptions.queryKey);
      queryClient.setQueryData<ListData>(listQueryOptions.queryKey, (old) =>
        old ? { ...old, items: old.items.filter((c) => c.id !== id) } : old,
      );
      if (isActive) {
        router.push('/chat');
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(listQueryOptions.queryKey, ctx.previous);
      }
      toast.error('Failed to delete conversation');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey });
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
      renameMutation.mutate({ id: conversation.id, title: trimmed });
    }
  };

  const isWorking = deleteMutation.isPending || renameMutation.isPending;

  return (
    <>
      <div
        className={`group flex h-9 items-center gap-1 rounded-md px-2 text-sm transition-colors ${
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
            {conversation.title ? (
              <span className="block truncate">{conversation.title}</span>
            ) : (
              <Skeleton className="h-3.5 w-3/4" />
            )}
          </Link>
        )}

        {isWorking ? (
          <Loader2Icon className="text-muted-foreground size-3 shrink-0 animate-spin" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="size-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                size="icon"
                variant="ghost"
              >
                <MoreHorizontalIcon className="text-muted-foreground size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(e) => {
                // When entering rename mode, prevent Radix from restoring focus to
                // the trigger button — the input will capture focus instead.
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
              onClick={() => deleteMutation.mutate({ id: conversation.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Sidebar listing all conversations with create/delete actions */
function ChatSidebar() {
  const { id: activeId } = useParams<{ id?: string }>();
  const { data, isPending } = useQuery(listQueryOptions);

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
        {isPending &&
          ['a', 'b', 'c', 'd'].map((k) => (
            <div className="px-2 py-1.5" key={k}>
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}

        {data?.items?.map((conversation) => (
          <ConversationItem
            conversation={conversation}
            isActive={activeId === conversation.id}
            key={conversation.id}
          />
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
