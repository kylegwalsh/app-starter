'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import * as React from 'react';

import { QueryProvider } from './query-provider';

/** All the necessary providers required for the app to function */
export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme>
        {children}
      </NextThemesProvider>
    </QueryProvider>
  );
};
