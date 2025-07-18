import { auth } from '@/core';

/** Grabs the current user's session */
export const useSession = () => {
  const { data, isPending, error, refetch } = auth.useSession();
  const session = data?.session;

  return { session, isLoading: isPending, error, refetch };
};
