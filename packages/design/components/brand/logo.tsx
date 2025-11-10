'use client';

import { config } from '@repo/config';
import { CommandIcon } from 'lucide-react';

/** The logo for the application */
export const Logo = () => (
  <div className="relative z-20 flex items-center font-medium text-foreground text-lg">
    <CommandIcon className="mr-2 h-6 w-6" />
    {config.app.name}
  </div>
);
