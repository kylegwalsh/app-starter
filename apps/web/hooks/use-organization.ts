import { auth } from '@/lib';

/** Grabs the current organization's details */
export const useOrganization = () => {
  const { data, isPending, error, refetch } = auth.useActiveOrganization();

  return { organization: data, isLoading: isPending, error, refetch };
};
