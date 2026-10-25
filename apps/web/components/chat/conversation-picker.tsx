'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from '@repo/design';
import { Check, ChevronDown, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { useConversations } from '@/hooks/use-conversations';

import { useChatContext } from './chat-provider';

/** Dropdown that shows the selected conversation and switches between new and recent ones */
export const ConversationPicker = () => {
  const { conversationId, loadingConversationId, openConversation, startNewConversation } =
    useChatContext();
  const { data, isPending } = useConversations();

  const conversations = data?.pages.flatMap((page) => page.items) ?? [];
  // The list already has every title, so a conversation being loaded can show its title right away
  const selectedId = loadingConversationId ?? conversationId;
  const selected = conversations.find((c) => c.id === selectedId);

  let label: ReactNode = 'New chat';
  if (selectedId) {
    // A brand-new conversation's title is still generating (null), so show a skeleton until then
    label = selected?.title ?? <Skeleton className="h-4 w-32" />;
  } else if (isPending) {
    label = <Skeleton className="h-4 w-32" />;
  }

  /** Shows a saved conversation, letting the user know if it can't be loaded */
  const selectConversation = (id: string) => {
    openConversation(id).catch(() => toast.error('Unable to load conversation'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="min-w-0 justify-start gap-1 px-2 font-medium" variant="ghost">
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuItem onSelect={startNewConversation}>
          <Plus className="size-4 shrink-0" />
          <span className="flex-1">New chat</span>
          {!selectedId && <Check className="size-4 shrink-0" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {conversations.length === 0 ? (
          <div className="text-muted-foreground px-2 py-1.5 text-sm">No conversations yet</div>
        ) : (
          conversations.map((conversation) => (
            <DropdownMenuItem
              key={conversation.id}
              onSelect={() => selectConversation(conversation.id)}
            >
              <span className="flex-1 truncate">{conversation.title ?? 'Untitled chat'}</span>
              {conversation.id === selectedId && <Check className="size-4 shrink-0" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
