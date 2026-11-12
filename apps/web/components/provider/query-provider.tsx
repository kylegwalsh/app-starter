'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';

/** Provides a query client for communicating with our backend */
export const QueryProvider: FC = ({ children }) => (
  <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
);
