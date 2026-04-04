'use client';

import { cn } from '@repo/design/lib/utils';
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react';

import { Button } from '../ui/button';

type ChatErrorProps = {
  /** The error message to display */
  message?: string;
  /** Called when the user clicks "Try again" */
  onRetry?: () => void;
  /** Additional class name */
  className?: string;
};

/** Inline error message shown when a chat response fails — replaces the assistant's typing indicator */
function ChatError({
  message = 'There was an error generating a response.',
  onRetry,
  className,
}: ChatErrorProps) {
  return (
    <div className={cn('flex items-start gap-3', className)} data-slot="chat-error">
      <div className="flex flex-col gap-2">
        <div className="text-destructive flex items-center gap-2 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
        {onRetry && (
          <Button className="w-fit gap-1.5" onClick={onRetry} size="sm" variant="outline">
            <RefreshCwIcon className="size-3" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export { ChatError, type ChatErrorProps };
