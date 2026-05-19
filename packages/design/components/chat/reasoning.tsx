'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/design/components/ui/collapsible';
import { cn } from '@repo/design/lib/utils';
import { ChevronRightIcon, LightbulbIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

import { Shimmer } from './shimmer';

const formatDuration = (ms: number) => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
};

export type ReasoningProps = Omit<ComponentProps<typeof Collapsible>, 'children'> & {
  /** Streaming = mid-thought; done = finished. Toggles the shimmer + locks the duration. */
  state?: 'streaming' | 'done';
  /** The reasoning text — rendered inside the collapsible body. */
  children?: React.ReactNode;
};

/**
 * Collapsible reasoning section, mirrored after the Tool component pattern.
 * Header shows a live duration while streaming (e.g. "Thinking… (3.2s)") and
 * locks to "Thought for 7.4s" once the model finishes. Replayed parts that
 * mount in the 'done' state with no streaming history just show "Thought".
 */
export const Reasoning = ({ state, className, children, ...props }: ReasoningProps) => {
  // Re-render every 250ms while streaming so the live duration updates.
  const [now, setNow] = useState(() => Date.now());
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (state === 'streaming' && startedAtRef.current == null) {
      startedAtRef.current = Date.now();
    }
    if (state === 'done' && startedAtRef.current != null && endedAt == null) {
      setEndedAt(Date.now());
    }
  }, [state, endedAt]);

  useEffect(() => {
    if (state !== 'streaming') {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [state]);

  const startedAt = startedAtRef.current;
  let duration: number | null = null;
  if (startedAt != null) {
    duration = endedAt != null ? endedAt - startedAt : now - startedAt;
  }

  return (
    <Collapsible
      className={cn('not-prose mb-2', className)}
      defaultOpen={state === 'streaming'}
      {...props}
    >
      <CollapsibleTrigger className="group/reasoning text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
        <LightbulbIcon className="size-3.5" />
        {state === 'streaming' ? (
          <Shimmer duration={1.5}>
            Thinking{duration != null && duration > 1000 ? ` (${formatDuration(duration)})` : '…'}
          </Shimmer>
        ) : (
          <span>
            {duration != null && duration > 200
              ? `Thought for ${formatDuration(duration)}`
              : 'Thought'}
          </span>
        )}
        <ChevronRightIcon className="-ml-0.5 size-3.5 translate-y-px opacity-0 transition-[opacity,transform] group-hover/reasoning:opacity-100 group-data-[state=open]/reasoning:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-muted/40 text-muted-foreground mt-2 ml-1.5 border-l-2 pl-3 text-xs whitespace-pre-wrap">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
