'use client';

import {
  ChangeEmailCard,
  ChangePasswordCard,
  UpdateAvatarCard,
  UpdateNameCard,
} from '@daveyplate/better-auth-ui';
import * as React from 'react';

import { SettingsLayout } from '@/components';

/** The account settings page */
export default function AccountSettingsPage() {
  return (
    <SettingsLayout
      title="Your profile"
      description="Update your account settings and login details">
      <UpdateAvatarCard />
      <UpdateNameCard />
      <ChangeEmailCard />
      <ChangePasswordCard />
    </SettingsLayout>
  );
}
