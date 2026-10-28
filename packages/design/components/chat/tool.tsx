'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/design/components/ui/collapsible';
import { cn } from '@repo/design/lib/utils';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { ChevronRightIcon, WrenchIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { isValidElement } from 'react';

import { CodeBlock } from './code-block';
import { MessageResponse } from './message';

export type ToolPart = ToolUIPart | DynamicToolUIPart;

// ---------- ToolOutput ----------
// Renders a tool result in a styled block. Used both inside `ToolStep` and
// externally for cases that want to show output without the collapsible
// wrapper.

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolPart['output'];
};

export const ToolOutput = ({ className, output, ...props }: ToolOutputProps) => {
  if (!output) {
    return null;
  }

  // String outputs (the common case — tools return Markdown) render inside a
  // subtle muted card, so they read as "content" and not as another header row,
  // but without the heavy bordered look.
  if (typeof output === 'string') {
    return (
      <div
        className={cn(
          'bg-muted/40 text-foreground/80 rounded-md px-2.5 py-1.5 text-xs leading-relaxed break-words',
          className,
        )}
        {...props}
      >
        <MessageResponse>{output}</MessageResponse>
      </div>
    );
  }

  // Object outputs get a compact JSON block — structured data still benefits
  // from formatting, but without the surrounding bordered card.
  if (typeof output === 'object' && !isValidElement(output)) {
    return (
      <div className={cn('text-xs', className)} {...props}>
        <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
      </div>
    );
  }

  // React node output — pass through as-is.
  return (
    <div className={cn('text-xs', className)} {...props}>
      {output as ReactNode}
    </div>
  );
};

// ---------- ToolStep ----------
// Subtle collapsible row for a single tool invocation — designed to live
// inside a `Steps` group. Shows just an icon + name in the header; the chevron
// fades in on hover. Expanded body renders `ToolOutput`.

export type ToolStepProps = Omit<ComponentProps<typeof Collapsible>, 'children'> & {
  /** Display name for the tool (caller-formatted) */
  name: string;
  /** Output payload from the tool */
  output?: ToolPart['output'];
  /** True when the tool execution failed — renders a static "(failed)" row. */
  failed?: boolean;
};

export const ToolStep = ({ name, output, failed, className, ...props }: ToolStepProps) => {
  // Errored tools render as a static "(failed)" row — no expansion, default
  // muted color. The raw error text isn't useful to the user and a red
  // expandable block reads heavier than the actual significance.
  if (failed) {
    return (
      <div
        className={cn(
          'not-prose text-muted-foreground flex items-center gap-1.5 text-xs',
          className,
        )}
      >
        <WrenchIcon className="size-3.5" />
        <span>{name} (failed)</span>
      </div>
    );
  }

  // No output — the tool hasn't produced anything meaningful to expand.
  // Render a static row with no chevron / hover affordance so the user
  // doesn't get a click target that opens an empty drawer.
  if (output == null) {
    return (
      <div
        className={cn(
          'not-prose text-muted-foreground flex items-center gap-1.5 text-xs',
          className,
        )}
      >
        <WrenchIcon className="size-3.5" />
        <span>{name}</span>
      </div>
    );
  }

  return (
    <Collapsible className={cn('not-prose', className)} {...props}>
      <CollapsibleTrigger className="group/tool text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
        <WrenchIcon className="size-3.5" />
        <span>{name}</span>
        <ChevronRightIcon className="-ml-0.5 size-3.5 translate-y-px opacity-0 transition-[opacity,transform] group-hover/tool:opacity-100 group-data-[state=open]/tool:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-muted/40 mt-2 ml-1.5 border-l-2 pl-3">
        <ToolOutput output={output} />
      </CollapsibleContent>
    </Collapsible>
  );
};
