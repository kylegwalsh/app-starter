'use client';

import { config } from '@repo/config';
import { CommandIcon } from 'lucide-react';

/** The logo for the application */
export const Logo = () => {
  return (
    <div className="relative z-20 flex items-center text-lg font-medium">
      <CommandIcon className="mr-2 h-6 w-6" />
      {config.app.name}
    </div>
  );
};
