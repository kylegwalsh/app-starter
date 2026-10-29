'use client';

import {
  Button,
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '@repo/design';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { useConversations } from '@/hooks/use-conversations';

import { useChatContext } from './chat-provider';

/** Dropdown that shows the selected conversation and switches between new and recent ones */
export const ConversationPicker = () => {
  const { conversationId, loadingConversationId, openConversation, startNewConversation } =
    useChatContext();
  const { data: conversations = [], isPending } = useConversations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // The list already has every title, so a conversation being loaded can show its title right away
  const selectedId = loadingConversationId ?? conversationId;
  const selected = conversations.find((c) => c.id === selectedId);
  // Filters the loaded conversations in memory by title
  const query = search.trim().toLowerCase();
  const matches = query
    ? conversations.filter((c) => c.title?.toLowerCase().includes(query))
    : conversations;

  let label: ReactNode = 'New chat';
  if (selectedId) {
    // A brand-new conversation's title is still generating (null), so show a skeleton until then
    label = selected?.title ?? <Skeleton className="h-4 w-32" />;
  } else if (isPending) {
    label = <Skeleton className="h-4 w-32" />;
  }

  /** Opens or closes the picker, clearing the search when it closes */
  const toggle = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearch('');
    }
  };

  /** Shows a saved conversation, letting the user know if it can't be loaded */
  const selectConversation = (id: string) => {
    toggle(false);
    openConversation(id).catch(() => toast.error('Unable to load conversation'));
  };

  return (
    <Popover onOpenChange={toggle} open={open}>
      <PopoverTrigger asChild>
        <Button className="min-w-0 justify-start gap-1 px-2 font-medium" variant="ghost">
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        {/* We filter ourselves (a plain title match), so turn off cmdk's fuzzy filtering */}
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearch}
            placeholder="Search conversations..."
            value={search}
          />
          <CommandList className="max-h-80">
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  toggle(false);
                  startNewConversation();
                }}
              >
                <Plus className="size-4 shrink-0" />
                <span className="flex-1">New chat</span>
                {!selectedId && <Check className="size-4 shrink-0" />}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            {/* "New chat" is always listed, so cmdk's own empty state would never show */}
            {matches.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                {conversations.length === 0 ? 'No conversations yet' : 'No matching conversations'}
              </div>
            ) : (
              <CommandGroup>
                {matches.map((conversation) => (
                  <CommandItem
                    key={conversation.id}
                    onSelect={() => selectConversation(conversation.id)}
                    value={conversation.id}
                  >
                    <span className="flex-1 truncate">{conversation.title ?? 'Untitled chat'}</span>
                    {conversation.id === selectedId && <Check className="size-4 shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
