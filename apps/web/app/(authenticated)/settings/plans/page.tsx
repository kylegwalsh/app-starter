'use client';

import { DashboardLayout, PlanCards } from '@/components';

/** The plans settings page */
const PlansPage = () => {
  return (
    <DashboardLayout className="px-0" description="Find a plan that works for you" title="Plans">
      <PlanCards />
    </DashboardLayout>
  );
};

export default PlansPage;
