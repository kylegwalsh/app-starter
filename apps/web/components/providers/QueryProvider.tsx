'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from '@/core';
import { config } from '@lib/config';
import superjson from 'superjson';

/** Provides a query client and trpc client for communicating with our backend */
export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // Adds pretty logs to your console in development and logs errors in production
        loggerLink({
          enabled: (opts) =>
            config.stage !== 'prod' || (opts.direction === 'down' && opts.result instanceof Error),
        }),
        // Connect to our backend
        httpBatchLink({
          transformer: superjson,
          url: `${config.api.url}/trpc`,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
