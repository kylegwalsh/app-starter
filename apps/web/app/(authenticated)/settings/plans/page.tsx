'use client';

import { config } from '@repo/config';
import { notFound } from 'next/navigation';

import { DashboardLayout, PlanCards } from '@/components';

/** The plans settings page */
export default function PlansPage() {
  // Plans only exist when Stripe is configured
  if (!config.stripe.isEnabled) {
    notFound();
  }

  return (
    <DashboardLayout className="px-0" description="Find a plan that works for you" title="Plans">
      <PlanCards />
    </DashboardLayout>
  );
}
