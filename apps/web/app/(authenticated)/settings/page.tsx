'use client';

import { Separator } from '@repo/design';
import * as React from 'react';

import { DashboardLayout } from '@/components';

/** The general settings page */
export default function GeneralSettingsPage() {
  return (
    <DashboardLayout
      title="General settings"
      description="Update your preferences and configure general settings"
      className="px-0">
      <p className="text-muted-foreground text-sm">Add new settings here...</p>

      <Separator />
    </DashboardLayout>
  );
}
