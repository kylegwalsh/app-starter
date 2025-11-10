'use client';

import { plans } from '@repo/constants';
import { Label, PricingCard, Switch } from '@repo/design';

import { auth } from '@/core';

type Props = {
  /** Whether we should show our monthly/annual switch */
  showSwitch?: boolean;
};

/** Our list of plan cards */
export const PlanCards: FC<Props> = ({ showSwitch = true }) => {
  /** Change the user's plan */
  const changePlan = async (plan: keyof typeof plans) => {
    if (plan === 'free') {
      await auth.subscription.cancel({
        returnUrl: '/settings/plans',
      });
      return;
    }
    await auth.subscription.upgrade({
      plan,
      successUrl: '/',
      cancelUrl: '/settings/plans',
    });
  };

  return (
    <>
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
          onClick={() => changePlan('free')}
          plan={plans.free.title}
          price={plans.free.price}
          // disabled={user?.subscription === 'free'}
        />

        <PricingCard
          description="Everything you need for a growing business"
          features={['5 user', 'Plan features', 'Product support']}
          onClick={() => changePlan('pro')}
          plan={plans.pro.title}
          popular
          price={plans.pro.price}
          // disabled={user?.subscription === 'pro'}
        />

        <PricingCard
          description="Advanced features for scaling your business"
          features={['10 user', 'Plan features', 'Product support']}
          onClick={() => changePlan('enterprise')}
          plan={plans.enterprise.title}
          price={plans.enterprise.price}
          // disabled={user?.subscription === 'enterprise'}
        />
      </div>
    </>
  );
};
