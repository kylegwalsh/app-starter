import { useQuery } from '@tanstack/react-query';

import { auth } from '@/core';

import { useOrganization } from './use-organization';

/** Fetches the active subscription for the current organization */
export const useSubscription = () => {
  const { organization } = useOrganization();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: async () => {
      const result = await auth.subscription.list({
        query: { referenceId: organization!.id, customerType: 'organization' },
      });
      return (
        result.data?.find((sub) => sub.status === 'active' || sub.status === 'trialing') ?? null
      );
    },
    enabled: !!organization?.id,
  });

  return { subscription: data ?? null, isLoading, error, refetch };
};
