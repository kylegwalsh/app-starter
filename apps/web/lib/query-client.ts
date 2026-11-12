import { QueryClient, environmentManager } from '@tanstack/react-query';

let browserQueryClient: QueryClient | undefined;

/** Returns the QueryClient for the current environment */
export const getQueryClient = () => {
  // On the server, create a new client per request so cached data is never shared between users
  if (environmentManager.isServer()) {
    return new QueryClient();
  }
  return (browserQueryClient ??= new QueryClient());
};
