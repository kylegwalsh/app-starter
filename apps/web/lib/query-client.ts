import { QueryClient, isServer } from '@tanstack/react-query';

let browserQueryClient: QueryClient | undefined;

/**
 * Returns the QueryClient for the current environment. The server gets a fresh
 * client per request so cached data never leaks between users; the browser
 * reuses one so module-level query options (and the `api` proxy in `./api`)
 * bind to the same cache the provider renders with.
 */
export const getQueryClient = (): QueryClient => {
  if (isServer) {
    return new QueryClient();
  }

  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
};
