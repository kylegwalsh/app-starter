'use client';

import { plans } from '@repo/constants';
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
import { useCallback, useState } from 'react';

import { useSubscription } from '@/hooks';

type Props = {
  /** Whether we should show our monthly/annual switch */
  showSwitch?: boolean;
};

/** Our list of plan cards */
export const PlanCards: FC<Props> = ({ showSwitch = true }) => {
  const { currentPlan, isFetched, upgrade, cancel } = useSubscription();
  const [pendingPlan, setPendingPlan] = useState<keyof typeof plans | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  /** Get the button text for a plan card based on whether it's an upgrade, downgrade, or current */
  const getButtonText = useCallback(
    (plan: keyof typeof plans) => {
      if (currentPlan === plan) {
        return 'Current plan';
      }

      const rank = { free: 0, pro: 1, enterprise: 2 } as const;
      return rank[plan] > rank[currentPlan as keyof typeof rank] ? 'Upgrade' : 'Downgrade';
    },
    [currentPlan],
  );

  /** Handle plan selection — cancel requires confirmation, upgrades go through directly */
  const handlePlanChange = useCallback(
    async (plan: keyof typeof plans) => {
      if (plan === 'free') {
        setPendingPlan(plan);
      } else {
        await upgrade({ plan, annual: isAnnual });
      }
    },
    [isAnnual, upgrade],
  );

  /** Confirm cancellation */
  const confirmCancel = useCallback(async () => {
    await cancel();
    setPendingPlan(null);
  }, [cancel]);

  return (
    <>
      {/* Cancellation confirmation dialog */}
      <AlertDialog
        open={pendingPlan === 'free'}
        onOpenChange={(open) => !open && setPendingPlan(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to your current plan features at the end of your billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my plan</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Confirm cancellation</AlertDialogAction>
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
            <Switch id="payment-schedule" checked={isAnnual} onCheckedChange={setIsAnnual} />
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
          onClick={() => handlePlanChange('free')}
          plan={plans.free.title}
          price={isAnnual ? plans.free.annualPrice : plans.free.price}
          disabled={currentPlan === 'free'}
          loading={!isFetched}
          buttonText={getButtonText('free')}
        />

        <PricingCard
          description="Everything you need for a growing business"
          features={['5 user', 'Plan features', 'Product support']}
          onClick={() => handlePlanChange('pro')}
          plan={plans.pro.title}
          popular
          price={isAnnual ? plans.pro.annualPrice : plans.pro.price}
          disabled={currentPlan === 'pro'}
          loading={!isFetched}
          buttonText={getButtonText('pro')}
        />

        <PricingCard
          description="Advanced features for scaling your business"
          features={['10 user', 'Plan features', 'Product support']}
          onClick={() => handlePlanChange('enterprise')}
          plan={plans.enterprise.title}
          price={isAnnual ? plans.enterprise.annualPrice : plans.enterprise.price}
          disabled={currentPlan === 'enterprise'}
          loading={!isFetched}
          buttonText={getButtonText('enterprise')}
        />
      </div>
    </>
  );
};
