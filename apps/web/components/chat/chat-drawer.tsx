'use client';

import { Button } from '@repo/design';
import { cn } from '@repo/design/lib/utils';
import { useAtom } from 'jotai';
import { Maximize2, MessageSquare, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { chatDrawerOpenAtom } from '@/atoms/chat';

import { useChatContext } from './chat-provider';
import { ChatView } from './chat-view';
import { ConversationPicker } from './conversation-picker';

/** A right-side drawer that keeps the chat conversation mounted on every page (other than /chat) */
export const ChatDrawer = () => {
  const router = useRouter();
  const isChatPage = usePathname().startsWith('/chat');
  const { conversationId } = useChatContext();
  const [isDrawerOpen, setDrawerOpen] = useAtom(chatDrawerOpenAtom);

  // We don't show this drawer on the chat page
  if (isChatPage) {
    return null;
  }

  /** Continues the conversation in the full-screen chat */
  const expand = () => {
    setDrawerOpen(false);
    router.push(conversationId ? `/chat/${conversationId}` : '/chat');
  };

  const state = isDrawerOpen ? 'open' : 'closed';

  return (
    <>
      <div
        className="hidden w-0 shrink-0 transition-[width] duration-200 ease-linear data-[state=open]:w-[420px] md:block"
        data-state={state}
      />
      <aside
        aria-hidden={!isDrawerOpen}
        className={cn(
          'bg-background fixed inset-y-0 right-0 z-40 flex w-full flex-col transition-transform duration-200 ease-linear md:z-10 md:w-[420px] md:border-l',
          'data-[state=closed]:translate-x-full',
        )}
        data-state={state}
        // Keep the hidden panel out of the tab order
        inert={!isDrawerOpen}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-2">
          <ConversationPicker />
          <div className="flex shrink-0 items-center gap-1">
            <Button aria-label="Open full screen" onClick={expand} size="icon" variant="ghost">
              <Maximize2 className="size-4" />
            </Button>
            <Button
              aria-label="Close chat"
              onClick={() => setDrawerOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ChatView showWelcome={false} />
        </div>
      </aside>
    </>
  );
};

/** Header button that opens and closes the chat drawer */
export const ChatDrawerToggle = () => {
  const isChatPage = usePathname().startsWith('/chat');
  const [isDrawerOpen, setDrawerOpen] = useAtom(chatDrawerOpenAtom);

  if (isChatPage) {
    return null;
  }

  return (
    <Button
      aria-label={isDrawerOpen ? 'Close chat' : 'Open chat'}
      aria-pressed={isDrawerOpen}
      onClick={() => setDrawerOpen(!isDrawerOpen)}
      size="icon"
      variant={isDrawerOpen ? 'secondary' : 'ghost'}
    >
      <MessageSquare className="size-4" />
    </Button>
  );
};
