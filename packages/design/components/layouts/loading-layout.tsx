'use client';

import { Loader2 } from 'lucide-react';

/** A layout that just shows a spinner */
export const LoadingLayout = () => {
  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
    </div>
  );
};
