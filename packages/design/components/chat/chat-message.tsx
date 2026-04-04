'use client';

import { cn } from '@repo/design/lib/utils';
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  LoaderIcon,
  SendIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';

type ChatMessageProps = {
  /** The role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** The rendered content of the message */
  children: ReactNode;
  /** Whether this is the latest assistant message */
  isLatest?: boolean;
  /** Whether the message is still streaming */
  isStreaming?: boolean;
  /** Existing feedback (true = up, false = down, null = none) */
  existingFeedback?: boolean | null;
  /** Called when the user copies the message text */
  onCopy?: () => void;
  /** Called when the user submits feedback */
  onFeedback?: (rating: 'up' | 'down', comment?: string) => void;
  /** Additional class name */
  className?: string;
};

function ChatMessage({
  role,
  children,
  isLatest = false,
  isStreaming = false,
  existingFeedback = null,
  onCopy,
  onFeedback,
  className,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  // true = thumbs up, false = thumbs down, null = no feedback
  const [feedback, setFeedback] = useState<boolean | null>(existingFeedback);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [comment, setComment] = useState('');
  const isAssistant = role === 'assistant';

  const handleCopy = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleThumbsUp = () => {
    setFeedback(true);
    onFeedback?.('up');
  };

  const handleThumbsDown = () => {
    setPopoverOpen(true);
  };

  const handleSubmitNegativeFeedback = () => {
    setFeedback(false);
    onFeedback?.('down', comment.trim() || undefined);
    setPopoverOpen(false);
    setComment('');
  };

  return (
    <div
      className={cn(
        'group flex gap-3',
        isAssistant ? 'items-start' : 'flex-row-reverse items-start',
        className,
      )}
      data-slot="chat-message"
    >
      {/* Avatar */}
      <Avatar className="mt-0.5 size-7 shrink-0">
        <AvatarFallback
          className={cn('text-xs', isAssistant ? 'bg-primary text-primary-foreground' : 'bg-muted')}
        >
          {isAssistant ? <BotIcon className="size-3.5" /> : <UserIcon className="size-3.5" />}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div className={cn('flex max-w-[80%] flex-col gap-1', !isAssistant && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isAssistant ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
          )}
        >
          {isStreaming && !children ? <ChatMessageSkeleton /> : children}
        </div>

        {/* Action buttons */}
        <div
          className={cn(
            'flex items-center gap-1',
            isAssistant && isLatest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'transition-opacity',
          )}
        >
          {/* Copy button */}
          <Button
            className="text-muted-foreground size-7"
            onClick={handleCopy}
            size="icon"
            variant="ghost"
          >
            {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          </Button>

          {/* Feedback buttons (assistant messages only) */}
          {isAssistant && !isStreaming && (
            <>
              <Button
                className={cn('size-7 text-muted-foreground', feedback === true && 'text-primary')}
                disabled={feedback !== null}
                onClick={handleThumbsUp}
                size="icon"
                variant="ghost"
              >
                <ThumbsUpIcon className="size-3" />
              </Button>

              <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    className={cn(
                      'size-7 text-muted-foreground',
                      feedback === false && 'text-destructive',
                    )}
                    disabled={feedback !== null}
                    onClick={handleThumbsDown}
                    size="icon"
                    variant="ghost"
                  >
                    <ThumbsDownIcon className="size-3" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="start" className="w-72 p-3" side="top">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium">How could this response be improved?</p>
                    <Textarea
                      className="min-h-16 resize-none text-xs"
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Optional feedback..."
                      rows={2}
                      value={comment}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSubmitNegativeFeedback} size="sm">
                        <SendIcon className="size-3" />
                        Submit
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Skeleton shown while streaming */
function ChatMessageSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1" data-slot="chat-message-skeleton">
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-36" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/** Typing indicator shown when assistant is generating */
function ChatTypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)} data-slot="chat-typing-indicator">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          <BotIcon className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted flex items-center gap-1.5 rounded-2xl px-4 py-3">
        <LoaderIcon className="text-muted-foreground size-3.5 animate-spin" />
        <span className="text-muted-foreground text-xs">Thinking...</span>
      </div>
    </div>
  );
}

export { ChatMessage, ChatMessageSkeleton, ChatTypingIndicator, type ChatMessageProps };
