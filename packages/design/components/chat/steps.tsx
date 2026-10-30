'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/design/components/ui/collapsible';
import { cn } from '@repo/design/lib/utils';
import { ChevronRightIcon, SparklesIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

/**
 * "Took N steps" collapsible wrapper for a sequence of process entries
 * (reasoning, tool calls, etc.) before a model's final answer. Mirrors the
 * compact pattern used by ChatGPT / Claude — header is a subtle row with a
 * sparkle icon, chevron fades in on hover, body renders the caller's steps
 * with a vertical connector line.
 */
export type StepsProps = Omit<ComponentProps<typeof Collapsible>, 'children'> & {
  /** Number of steps — used to render the "Took N step(s)" label */
  count: number;
  /** Step entries (typically `<Reasoning>` and/or `<ToolStep>` components) */
  children?: ReactNode;
};

export const Steps = ({ count, className, children, ...props }: StepsProps) => (
  <Collapsible className={cn('not-prose', className)} {...props}>
    <CollapsibleTrigger className="group/steps text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
      <SparklesIcon className="size-3.5" />
      <span>
        Took {count} step{count === 1 ? '' : 's'}
      </span>
      <ChevronRightIcon className="-ml-0.5 size-3.5 translate-y-px opacity-0 transition-[opacity,transform] group-hover/steps:opacity-100 group-data-[state=open]/steps:rotate-90" />
    </CollapsibleTrigger>
    <CollapsibleContent className="border-muted/40 mt-2 ml-1.5 space-y-2 border-l-2 pl-3">
      {children}
    </CollapsibleContent>
  </Collapsible>
);
