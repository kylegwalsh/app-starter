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
import { useOrganization } from '@/hooks';

/** The organization settings page */
export default function OrganizationSettingsPage() {
  const organization = useOrganization();
  const router = useRouter();

  // If the user is not logged into their organization, redirect to the main settings page
  React.useEffect(() => {
    if (!organization.isActive && !organization.isLoading) {
      router.push('/settings');
    }
  }, [organization, router]);

  // Show loading or nothing while redirecting
  if (!organization.isActive) {
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
