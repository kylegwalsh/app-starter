'use client';

import { ThemeProvider } from '@repo/design';
import * as React from 'react';

import { QueryProvider } from './query-provider';

/** All the necessary providers required for the app to function */
export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryProvider>
  );
};
