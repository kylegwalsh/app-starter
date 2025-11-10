import { auth } from '@/core';

import { useOrganization } from './use-organization';

/** Grabs the current user's details along with their organization data */
export const useUser = () => {
  const { data, isPending, error, refetch } = auth.useSession();
  const {
    organization,
    isLoading: isOrgLoading,
    refetch: refetchOrg,
  } = useOrganization();

  const user = data?.user;
  const isLoading = isPending || isOrgLoading;

  // Combined refetch function that refreshes both user and org data
  const refetchAll = async () => {
    await Promise.all([refetch(), refetchOrg()]);
  };

  return {
    user,
    organization,
    isLoggedIn: !!user && !!organization,
    isLoading,
    error,
    refetch: refetchAll,
  };
};
