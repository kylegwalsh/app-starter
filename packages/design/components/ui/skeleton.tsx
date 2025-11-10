import { cn } from '@repo/design/lib/utils';
import type { ComponentProps } from 'react';

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-accent', className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
