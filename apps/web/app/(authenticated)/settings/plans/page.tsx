'use client';

import React from 'react';

import { PlanCards, SettingsLayout } from '@/components';

/** The plans settings page */
export default function PlansPage() {
  return (
    <SettingsLayout title="Plans" description="Find a plan that works for you">
      <PlanCards />
    </SettingsLayout>
  );
}
