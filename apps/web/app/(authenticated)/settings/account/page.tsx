'use client';

import {
  ChangeEmailCard,
  ChangePasswordCard,
  UpdateAvatarCard,
  UpdateNameCard,
} from '@daveyplate/better-auth-ui';
import * as React from 'react';

import { DashboardLayout } from '@/components';

/** The account settings page */
export default function AccountSettingsPage() {
  return (
    <DashboardLayout
      title="Your profile"
      description="Update your account settings and login details"
      className="px-0">
      <UpdateAvatarCard />
      <UpdateNameCard />
      <ChangeEmailCard />
      <ChangePasswordCard />
    </DashboardLayout>
  );
}
