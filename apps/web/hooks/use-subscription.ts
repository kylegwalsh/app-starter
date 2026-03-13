import { type plans } from '@repo/constants';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { auth } from '@/core';

import { useOrganization } from './use-organization';

/** Fetches the active subscription for the current organization and exposes upgrade/cancel actions */
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

  const subscription = data ?? null;
  const currentPlan = subscription?.plan ?? 'free';

  /** Upgrade or switch to a new plan */
  const upgrade = useCallback(
    async (plan: keyof typeof plans) => {
      if (!organization?.id) {
        return;
      }

      await auth.subscription.upgrade({
        plan,
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
    isLoading,
    error,
    refetch,
    upgrade,
    cancel,
    openBillingPortal,
  };
};
