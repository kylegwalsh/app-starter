'use client';

import { type plans } from '@repo/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Label,
  PricingCard,
  Switch,
} from '@repo/design';
import { useState } from 'react';

import { useSubscription } from '@/hooks';

type Props = {
  /** Whether we should show our monthly/annual switch */
  showSwitch?: boolean;
};

/** Our list of plan cards */
export const PlanCards: FC<Props> = ({ showSwitch = true }) => {
  const { currentPlan, isLoading, upgrade, cancel } = useSubscription();
  const [pendingPlan, setPendingPlan] = useState<keyof typeof plans | null>(null);

  /** Confirm and execute the plan change */
  const confirmChangePlan = async () => {
    if (!pendingPlan) {
      return;
    }

    if (pendingPlan === 'free') {
      await cancel();
    } else {
      await upgrade(pendingPlan);
    }
    setPendingPlan(null);
  };

  const isCancelling = pendingPlan === 'free';

  return (
    <>
      {/* Confirmation dialog */}
      <AlertDialog open={!!pendingPlan} onOpenChange={(open) => !open && setPendingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCancelling ? 'Cancel your subscription?' : `Switch to ${pendingPlan}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCancelling
                ? 'You will lose access to your current plan features at the end of your billing period.'
                : `You are about to change your plan from ${currentPlan} to ${pendingPlan}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isCancelling ? 'Keep my plan' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangePlan}>
              {isCancelling ? 'Confirm cancellation' : 'Confirm change'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Monthly/Annual switch */}
      {showSwitch && (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center">
            <Label className="me-3" htmlFor="payment-schedule">
              Monthly
            </Label>
            <Switch id="payment-schedule" />
            <Label className="ms-3" htmlFor="payment-schedule">
              Annual
            </Label>
          </div>
        </div>
      )}

      {/* Pricing cards */}
      <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-center">
        <PricingCard
          description="Get started with the essentials"
          features={['1 user', 'Plan features', 'Product support']}
          onClick={() => setPendingPlan('free')}
          plan="Free"
          price={0}
          disabled={isLoading || currentPlan === 'free'}
        />

        <PricingCard
          description="Everything you need for a growing business"
          features={['5 user', 'Plan features', 'Product support']}
          onClick={() => setPendingPlan('pro')}
          plan="Pro"
          popular
          price={50}
          disabled={isLoading || currentPlan === 'pro'}
        />

        <PricingCard
          description="Advanced features for scaling your business"
          features={['10 user', 'Plan features', 'Product support']}
          onClick={() => setPendingPlan('enterprise')}
          plan="Enterprise"
          price={100}
          disabled={isLoading || currentPlan === 'enterprise'}
        />
      </div>
    </>
  );
};
