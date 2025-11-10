'use client';

import {
  ChangeEmailCard,
  ChangePasswordCard,
  UpdateAvatarCard,
  UpdateNameCard,
} from '@daveyplate/better-auth-ui';

import { DashboardLayout } from '@/components';

/** The account settings page */
export default function AccountSettingsPage() {
  return (
    <DashboardLayout
      className="px-0"
      description="Update your account settings and login details"
      title="Your profile"
    >
      <UpdateAvatarCard />
      <UpdateNameCard />
      <ChangeEmailCard />
      <ChangePasswordCard />
    </DashboardLayout>
  );
}
