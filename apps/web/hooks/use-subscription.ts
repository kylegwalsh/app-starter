import { config } from '@repo/config';
import { plans } from '@repo/constants';
import { toast } from '@repo/design';
import { useMutation, useQuery } from '@tanstack/react-query';

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
      return (
        result.data?.find((sub) => sub.status === 'active' || sub.status === 'trialing') ?? null
      );
    },
    enabled: !!organization?.id && config.stripe.isEnabled,
  });

  /** The current plan the user is on */
  const currentPlan = isFetched ? (subscription?.plan ?? plans.free.name) : undefined;
  /** Whether the current subscription is billed annually */
  const isAnnual = subscription?.billingInterval === 'year' ? true : false;

  /** Upgrade or switch to a new plan */
  const {
    mutateAsync: upgrade,
    isPending: isUpgrading,
    isError: isUpgradeError,
  } = useMutation({
    mutationFn: async ({
      plan,
      annual = false,
    }: {
      plan: keyof typeof plans;
      annual?: boolean;
    }) => {
      if (!organization?.id || !config.stripe.isEnabled) {
        return;
      }
      const { error } = await auth.subscription.upgrade({
        plan,
        annual,
        referenceId: organization.id,
        customerType: 'organization',
        successUrl: `${config.app.url}/settings/plans`,
        cancelUrl: `${config.app.url}/settings/plans`,
        returnUrl: `${config.app.url}/settings/plans`,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onError: () => toast.error('Failed to upgrade plan. Please try again.'),
  });

  /** Cancel the current subscription */
  const {
    mutateAsync: cancel,
    isPending: isCancelling,
    isError: isCancelError,
  } = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !subscription?.stripeSubscriptionId || !config.stripe.isEnabled) {
        return;
      }
      const { error } = await auth.subscription.cancel({
        referenceId: organization.id,
        customerType: 'organization',
        subscriptionId: subscription.stripeSubscriptionId,
        returnUrl: `${config.app.url}/settings/plans`,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('already set to be canceled') ||
        message.includes('cancel_at_period_end')
      ) {
        toast.info(
          'Your subscription is already scheduled to be cancelled at the end of the current term.',
        );
      } else {
        toast.error('Failed to cancel subscription. Please try again.');
      }
    },
  });

  /** Open the Stripe billing portal for managing payment methods */
  const {
    mutateAsync: openBillingPortal,
    isPending: isOpeningBillingPortal,
    isError: isOpenBillingPortalError,
  } = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !config.stripe.isEnabled) {
        return;
      }
      const { error } = await auth.subscription.billingPortal({
        referenceId: organization.id,
        customerType: 'organization',
        returnUrl: `${config.app.url}/settings/billing`,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onError: () => toast.error('Failed to open billing portal. Please try again.'),
  });

  return {
    subscription: subscription ?? undefined,
    currentPlan,
    isAnnual,
    isFetched,
    isLoading,
    error,
    refetch,
    upgrade,
    isUpgrading,
    isUpgradeError,
    cancel,
    isCancelling,
    isCancelError,
    openBillingPortal,
    isOpeningBillingPortal,
    isOpenBillingPortalError,
  };
};
