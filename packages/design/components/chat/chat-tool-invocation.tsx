'use client';

import { cn } from '@repo/design/lib/utils';
import { AlertCircleIcon, CheckCircleIcon, LoaderIcon, WrenchIcon } from 'lucide-react';

type ToolInvocationState = 'call' | 'partial-call' | 'result' | 'error';

type ChatToolInvocationProps = {
  /** Name of the tool being called */
  toolName: string;
  /** Current state of the tool invocation */
  state: ToolInvocationState;
  /** The result text (if state is 'result') */
  result?: string;
  /** Error text (if state is 'error') */
  error?: string;
  /** Additional class name */
  className?: string;
};

function ChatToolInvocation({
  toolName,
  state,
  result,
  error,
  className,
}: ChatToolInvocationProps) {
  const isLoading = state === 'call' || state === 'partial-call';
  const isError = state === 'error';
  const isComplete = state === 'result';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        isError && 'border-destructive/30 bg-destructive/5',
        isComplete && 'border-border bg-muted/50',
        isLoading && 'border-border bg-muted/30',
        className,
      )}
      data-slot="chat-tool-invocation"
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {isLoading && <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />}
        {isComplete && <CheckCircleIcon className="size-3.5 text-green-600" />}
        {isError && <AlertCircleIcon className="size-3.5 text-destructive" />}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        {/* Tool name */}
        <div className="flex items-center gap-1.5">
          <WrenchIcon className="size-3 text-muted-foreground" />
          <span className="font-medium text-foreground">{formatToolName(toolName)}</span>
          {isLoading && <span className="text-muted-foreground">Running...</span>}
        </div>

        {/* Result or error */}
        {isComplete && result && (
          <p className="line-clamp-3 text-muted-foreground">{result}</p>
        )}
        {isError && error && <p className="text-destructive">{error}</p>}
      </div>
    </div>
  );
}

/** Convert kebab-case tool names to readable text */
const formatToolName = (name: string) =>
  name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export { ChatToolInvocation, type ChatToolInvocationProps };
