'use client';

import { SidebarProvider, ThemeProvider } from '@repo/design';
import * as React from 'react';

import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';

/** All the necessary providers required for the app to function */
export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
