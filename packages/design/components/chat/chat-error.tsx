'use client';

import { cn } from '@repo/design/lib/utils';
import { InfoIcon } from 'lucide-react';

import { Button } from '../ui/button';

export type ChatErrorProps = {
  /** The error message to display */
  message?: string;
  /** Called when the user clicks "Retry" */
  onRetry?: () => void;
  /** Classes for the wrapper */
  className?: string;
};

/** Inline error shown in place of the assistant's reply when a response fails */
export const ChatError = ({
  message = 'There was an error generating a response.',
  onRetry,
  className,
}: ChatErrorProps) => (
  <div
    className={cn(
      'bg-muted text-muted-foreground flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 py-2 text-sm',
      className,
    )}
    data-slot="chat-error"
    role="alert"
  >
    <div className="flex items-center gap-2">
      <InfoIcon className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <Button className="shrink-0" onClick={onRetry} size="sm" variant="outline">
        Retry
      </Button>
    )}
  </div>
);
