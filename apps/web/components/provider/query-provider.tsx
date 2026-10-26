'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';

/** Provides a query client for communicating with our backend */
export const QueryProvider: FC = ({ children }) => {
  // Shared with the `api` proxy in `@/lib/api`, which needs a client at module
  // scope — see getQueryClient for the server/browser split.
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
