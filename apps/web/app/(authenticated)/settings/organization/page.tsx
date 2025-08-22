'use client';

import {
  DeleteOrganizationCard,
  OrganizationInvitationsCard,
  OrganizationLogoCard,
  OrganizationMembersCard,
  OrganizationNameCard,
  OrganizationSlugCard,
} from '@daveyplate/better-auth-ui';
import { LoadingLayout } from '@repo/design';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DashboardLayout } from '@/components';
import { useUser } from '@/hooks';

/** The organization settings page */
export default function OrganizationSettingsPage() {
  const { isLoading, organization } = useUser();
  const router = useRouter();

  // If the user is not logged into an organization, redirect to the main settings page
  React.useEffect(() => {
    // TODO: Upgrade better auth to fix this
    // @ts-expect-error - better auth is fixing the types here
    if (!isLoading && organization?.isPersonal) {
      router.push('/settings');
    }
  }, [isLoading, organization, router]);

  // Show loading or nothing while redirecting
  // TODO: Upgrade better auth to fix this
  // @ts-expect-error - better auth is fixing the types here
  if (isLoading || organization?.isPersonal) {
    return <LoadingLayout />;
  }

  return (
    <DashboardLayout
      title="Organization"
      description="Update your organization settings"
      className="px-0">
      <OrganizationLogoCard />
      <OrganizationNameCard />
      <OrganizationSlugCard />
      <OrganizationMembersCard />
      <OrganizationInvitationsCard />
      <DeleteOrganizationCard />
    </DashboardLayout>
  );
}
