import { auth } from '@/core';

/** Grabs the current user's details */
export const useCurrentUser = () => {
  const { data, isPending, error, refetch } = auth.useSession();
  const user = data?.user;

  return { user, isLoggedIn: !!user, isLoading: isPending, error, refetch };
};
