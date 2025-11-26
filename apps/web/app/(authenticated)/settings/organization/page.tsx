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
import { useEffect } from 'react';

import { DashboardLayout } from '@/components';
import { useUser } from '@/hooks';

/** The organization settings page */
export default function OrganizationSettingsPage() {
  const { isLoading, organization } = useUser();
  const router = useRouter();

  // If the user is not logged into an organization, redirect to the main settings page
  useEffect(() => {
    if (!isLoading && organization?.isPersonal) {
      router.push('/settings');
    }
  }, [isLoading, organization, router]);

  // Show loading or nothing while redirecting
  if (isLoading || organization?.isPersonal) {
    return <LoadingLayout />;
  }

  return (
    <DashboardLayout
      className="px-0"
      description="Update your organization settings"
      title="Organization"
    >
      <OrganizationLogoCard />
      <OrganizationNameCard />
      <OrganizationSlugCard />
      <OrganizationMembersCard />
      <OrganizationInvitationsCard />
      <DeleteOrganizationCard />
    </DashboardLayout>
  );
}
