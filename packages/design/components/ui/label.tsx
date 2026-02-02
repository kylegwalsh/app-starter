'use client';

// biome-ignore lint/performance/noNamespaceImport: This won't impact performance
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@repo/design/lib/utils';
import type { ComponentProps } from 'react';

function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
