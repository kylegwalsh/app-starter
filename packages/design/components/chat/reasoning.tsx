'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/design/components/ui/collapsible';
import { cn } from '@repo/design/lib/utils';
import { ChevronRightIcon, LightbulbIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Shimmer } from './shimmer';

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  /** Whether the model is still thinking */
  streaming?: boolean;
};

/** A model's reasoning that expands to show the text */
export const Reasoning = ({ streaming, className, children, ...props }: ReasoningProps) => (
  <Collapsible className={cn('not-prose mb-2', className)} defaultOpen={streaming} {...props}>
    <CollapsibleTrigger className="group/reasoning text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
      <LightbulbIcon className="size-3.5" />
      {streaming ? <Shimmer duration={1.5}>Thinking…</Shimmer> : <span>Thought</span>}
      <ChevronRightIcon className="-ml-0.5 size-3.5 translate-y-px opacity-0 transition-[opacity,transform] group-hover/reasoning:opacity-100 group-data-[state=open]/reasoning:rotate-90" />
    </CollapsibleTrigger>
    <CollapsibleContent className="border-muted/40 text-muted-foreground mt-2 ml-1.5 border-l-2 pl-3 text-xs whitespace-pre-wrap">
      {children}
    </CollapsibleContent>
  </Collapsible>
);
