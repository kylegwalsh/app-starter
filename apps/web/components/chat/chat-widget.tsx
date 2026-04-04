'use client';

import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/design/components/ui';
import { MessageCircleIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { ChatProvider } from './chat-provider';
import { ChatView } from './chat-view';

/** Floating chat widget — renders as a sheet on the right side */
function ChatWidget() {
  const [open, setOpen] = useState(false);
  // Increment session key on each open to reset chat state
  const [sessionKey, setSessionKey] = useState(0);
  const id = useId();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSessionKey((prev) => prev + 1);
    }
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetTrigger asChild>
        <Button className="fixed right-6 bottom-6 z-50 size-12 rounded-full shadow-lg" size="icon">
          <MessageCircleIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md" side="right">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <ChatProvider key={`${id}-${String(sessionKey)}`}>
            <ChatView />
          </ChatProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { ChatWidget };
