'use client';

import { Separator } from '@repo/design';
import * as React from 'react';

import { SettingsLayout } from '@/components';

/** The general settings page */
export default function GeneralSettingsPage() {
  return (
    <SettingsLayout
      title="General settings"
      description="Update your preferences and configure general settings">
      <p className="text-muted-foreground text-sm">Add new settings here...</p>

      <Separator />
    </SettingsLayout>
  );
}
