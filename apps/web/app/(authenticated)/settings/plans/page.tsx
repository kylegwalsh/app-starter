'use client';

import React from 'react';

import { DashboardLayout, PlanCards } from '@/components';

/** The plans settings page */
export default function PlansPage() {
  return (
    <DashboardLayout title="Plans" description="Find a plan that works for you" className="px-0">
      <PlanCards />
    </DashboardLayout>
  );
}
