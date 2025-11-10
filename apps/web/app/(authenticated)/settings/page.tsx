'use client';

import { Separator } from '@repo/design';

import { DashboardLayout } from '@/components';

/** The general settings page */
export default function GeneralSettingsPage() {
  return (
    <DashboardLayout
      className="px-0"
      description="Update your preferences and configure general settings"
      title="General settings"
    >
      <p className="text-muted-foreground text-sm">Add new settings here...</p>

      <Separator />
    </DashboardLayout>
  );
}
