'use client';

import { plans } from '@repo/constants';
import { Label, PricingCard, Switch } from '@repo/design';
import { useCallback, useEffect, useState } from 'react';

import { useSubscription } from '@/hooks';

type Props = {
  /** Whether we should show our monthly/annual switch */
  showSwitch?: boolean;
};

/** Our list of plan cards */
export const PlanCards: FC<Props> = ({ showSwitch = true }) => {
  const {
    currentPlan,
    isAnnual: isAnnualSubscription,
    isFetched,
    upgrade,
    cancel,
  } = useSubscription();
  const [activePlan, setActivePlan] = useState<keyof typeof plans | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  // Default the toggle to the user's current billing period once loaded
  useEffect(() => {
    if (isFetched) {
      setIsAnnual(isAnnualSubscription);
    }
  }, [isFetched, isAnnualSubscription]);

  /** Get the button text for a plan card */
  const getButtonText = useCallback(
    (plan: keyof typeof plans) => {
      if (currentPlan === plan) {
        // If the user is on this plan but toggled to a different billing period, offer the switch
        if (isAnnual && !isAnnualSubscription) {
          return 'Change to annual';
        }
        if (!isAnnual && isAnnualSubscription) {
          return 'Change to monthly';
        }
        return 'Current plan';
      }

      const rank = { free: 0, pro: 1, enterprise: 2 } as const;
      return rank[plan] > rank[currentPlan as keyof typeof rank] ? 'Upgrade' : 'Downgrade';
    },
    [currentPlan, isAnnual, isAnnualSubscription],
  );

  /** Whether the button for a given plan should be disabled */
  const isDisabled = useCallback(
    (plan: keyof typeof plans) => {
      if (!!activePlan && activePlan !== plan) {
        return true;
      }
      // Disable if on this plan with matching billing period
      if (currentPlan === plan && isAnnual === isAnnualSubscription) {
        return true;
      }
      return false;
    },
    [activePlan, currentPlan, isAnnual, isAnnualSubscription],
  );

  /** Handle plan selection */
  const handlePlanChange = useCallback(
    async (plan: keyof typeof plans) => {
      setActivePlan(plan);
      try {
        if (plan === 'free') {
          await cancel();
        } else {
          await upgrade({ plan, annual: isAnnual });
        }
      } finally {
        setActivePlan(null);
      }
    },
    [isAnnual, upgrade, cancel],
  );

  return (
    <>
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
          initializing={!isFetched}
          loading={activePlan === 'free'}
          disabled={isDisabled('free')}
          buttonText={getButtonText('free')}
        />

        <PricingCard
          description="Everything you need for a growing business"
          features={['5 user', 'Plan features', 'Product support']}
          onClick={() => handlePlanChange('pro')}
          plan={plans.pro.title}
          popular
          price={isAnnual ? plans.pro.annualPrice : plans.pro.price}
          initializing={!isFetched}
          loading={activePlan === 'pro'}
          disabled={isDisabled('pro')}
          buttonText={getButtonText('pro')}
        />

        <PricingCard
          description="Advanced features for scaling your business"
          features={['10 user', 'Plan features', 'Product support']}
          onClick={() => handlePlanChange('enterprise')}
          plan={plans.enterprise.title}
          price={isAnnual ? plans.enterprise.annualPrice : plans.enterprise.price}
          initializing={!isFetched}
          loading={activePlan === 'enterprise'}
          disabled={isDisabled('enterprise')}
          buttonText={getButtonText('enterprise')}
        />
      </div>
    </>
  );
};
