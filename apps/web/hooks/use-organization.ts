import { auth } from '@/core';

/** Grabs the current user's organization details */
export const useOrganization = () => {
  const { data, isPending, error, refetch } = auth.useActiveOrganization();

  return { organization: data, isActive: !!data, isLoading: isPending, error, refetch };
};
