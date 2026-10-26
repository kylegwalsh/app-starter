import { cn } from '@repo/design/lib/utils';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- shadcn marks the spinner icon as a live status
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
