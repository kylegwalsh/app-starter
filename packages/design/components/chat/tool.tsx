'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/design/components/ui/collapsible';
import { cn } from '@repo/design/lib/utils';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { ChevronRightIcon, WrenchIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { MessageResponse } from './message';

/** A tool call part from an AI SDK message */
export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolOutputProps = ComponentProps<'div'> & {
  /** The tool's result */
  output: ToolPart['output'];
};

/** Renders a tool's result: Markdown text in a muted card, anything else as JSON */
export const ToolOutput = ({ className, output, ...props }: ToolOutputProps) => {
  if (!output) {
    return null;
  }

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

  return (
    <div className={cn('text-xs', className)} {...props}>
      <MessageResponse>{`\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``}</MessageResponse>
    </div>
  );
};

export type ToolStepProps = Omit<ComponentProps<typeof Collapsible>, 'children'> & {
  /** Display name for the tool (caller-formatted) */
  name: string;
  /** The tool's result, shown when the row is expanded */
  output?: ToolPart['output'];
  /** Whether the tool call failed */
  failed?: boolean;
};

/** A tool call row inside `Steps` that expands to show its output */
export const ToolStep = ({ name, output, failed, className, ...props }: ToolStepProps) => {
  // Failed and output-less calls have nothing to expand, so they render a plain row
  if (failed || output == null) {
    return (
      <div
        className={cn(
          'not-prose text-muted-foreground flex items-center gap-1.5 text-xs',
          className,
        )}
      >
        <WrenchIcon className="size-3.5" />
        <span>{failed ? `${name} (failed)` : name}</span>
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
