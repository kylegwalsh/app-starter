'use client';

import { cn } from '@repo/design/lib/utils';
import { ArrowDownIcon } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '../ui/button';

type ChatMessagesProps = {
  /** The message elements to render */
  children: ReactNode;
  /** Whether the chat is currently streaming */
  isLoading?: boolean;
  /** Additional class name */
  className?: string;
};

function ChatMessages({ children, className }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Track whether the user has scrolled away from the bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const threshold = 50;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  // Auto-scroll when new content arrives and user is at the bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [children, isAtBottom, scrollToBottom]);

  return (
    <div className={cn('relative flex-1 overflow-hidden', className)} data-slot="chat-messages">
      <div
        className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
        ref={containerRef}
      >
        {children}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <Button
            className="size-8 rounded-full shadow-md"
            onClick={scrollToBottom}
            size="icon"
            variant="outline"
          >
            <ArrowDownIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export { ChatMessages, type ChatMessagesProps };
