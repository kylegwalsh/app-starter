'use client';

import { cn } from '@repo/design/lib/utils';
import type { HTMLAttributes } from 'react';

export type ShimmerProps = HTMLAttributes<HTMLSpanElement> & {
  duration?: number;
};

/**
 * Renders children with an animated shimmer/sweep highlight effect.
 * Uses a pure-CSS gradient animation — no external dependencies.
 */
export const Shimmer = ({ className, children, duration = 2, style, ...props }: ShimmerProps) => (
  <span
    className={cn('animate-shimmer bg-clip-text text-transparent', className)}
    style={
      {
        backgroundImage:
          'linear-gradient(90deg, var(--color-muted-foreground) 0%, var(--color-foreground) 40%, var(--color-muted-foreground) 60%, var(--color-muted-foreground) 100%)',
        backgroundSize: '200% 100%',
        animationDuration: `${String(duration)}s`,
        ...style,
      } as React.CSSProperties
    }
    {...props}
  >
    {children}
  </span>
);
