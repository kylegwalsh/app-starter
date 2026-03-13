import { plans } from '@repo/constants';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { auth } from '@/core';

import { useOrganization } from './use-organization';

/** Fetches the active subscription for the current organization and exposes upgrade/cancel actions */
export const useSubscription = () => {
  const { organization } = useOrganization();

  const {
    data: subscription,
    isFetched,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: async () => {
      const result = await auth.subscription.list({
        query: { referenceId: organization!.id, customerType: 'organization' },
      });
      return result.data?.find((sub) => sub.status === 'active' || sub.status === 'trialing');
    },
    enabled: !!organization?.id,
  });

  const currentPlan = isFetched ? (subscription?.plan ?? plans.free.name) : undefined;

  /** Upgrade or switch to a new plan */
  const upgrade = useCallback(
    async ({ plan, annual = false }: { plan: keyof typeof plans; annual?: boolean }) => {
      if (!organization?.id) {
        return;
      }

      await auth.subscription.upgrade({
        plan,
        annual,
        referenceId: organization.id,
        customerType: 'organization',
        successUrl: '/',
        cancelUrl: '/settings/plans',
      });
    },
    [organization?.id],
  );

  /** Cancel the current subscription */
  const cancel = useCallback(async () => {
    if (!organization?.id || !subscription?.id) {
      return;
    }

    await auth.subscription.cancel({
      referenceId: organization.id,
      customerType: 'organization',
      subscriptionId: subscription.id,
      returnUrl: '/settings/plans',
    });
  }, [organization?.id, subscription?.id]);

  /** Open the Stripe billing portal for managing payment methods */
  const openBillingPortal = useCallback(async () => {
    if (!organization?.id) {
      return;
    }

    await auth.subscription.billingPortal({
      referenceId: organization.id,
      customerType: 'organization',
      returnUrl: '/settings/billing',
    });
  }, [organization?.id]);

  return {
    subscription,
    currentPlan,
    isFetched,
    isLoading,
    error,
    refetch,
    upgrade,
    cancel,
    openBillingPortal,
  };
};
