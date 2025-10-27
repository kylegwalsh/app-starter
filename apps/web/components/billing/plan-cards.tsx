'use client';

import { plans } from '@repo/constants';
import { Label, PricingCard, Switch } from '@repo/design';
import React from 'react';

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
    } else {
      await auth.subscription.upgrade({
        plan,
        successUrl: '/',
        cancelUrl: '/settings/plans',
      });
    }
  };

  return (
    <>
      {/* Monthly/Annual switch */}
      {showSwitch && (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center">
            <Label htmlFor="payment-schedule" className="me-3">
              Monthly
            </Label>
            <Switch id="payment-schedule" />
            <Label htmlFor="payment-schedule" className="ms-3">
              Annual
            </Label>
          </div>
        </div>
      )}

      {/* Pricing cards */}
      <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-center">
        <PricingCard
          plan={plans.free.title}
          price={plans.free.price}
          description="Get started with the essentials"
          features={['1 user', 'Plan features', 'Product support']}
          onClick={() => void changePlan('free')}
          // disabled={user?.subscription === 'free'}
        />

        <PricingCard
          popular
          plan={plans.pro.title}
          price={plans.pro.price}
          description="Everything you need for a growing business"
          features={['5 user', 'Plan features', 'Product support']}
          onClick={() => void changePlan('pro')}
          // disabled={user?.subscription === 'pro'}
        />

        <PricingCard
          plan={plans.enterprise.title}
          price={plans.enterprise.price}
          description="Advanced features for scaling your business"
          features={['10 user', 'Plan features', 'Product support']}
          onClick={() => void changePlan('enterprise')}
          // disabled={user?.subscription === 'enterprise'}
        />
      </div>
    </>
  );
};
