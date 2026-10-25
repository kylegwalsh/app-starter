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
import { auth } from '@/lib';

/** The organization settings page */
const OrganizationSettingsPage = () => {
  const { isLoading, organization } = useUser();
  const { data: sessionData } = auth.useSession();
  const router = useRouter();

  // After leaving or deleting an organization, the session switches before the cached organization
  // catches up. Wait for them to match so the cards don't query/error for the old one.
  const isSwitchingOrganization = organization?.id !== sessionData?.session.activeOrganizationId;

  // If the user is not logged into an organization, redirect to the main settings page
  useEffect(() => {
    if (!isLoading && organization?.isPersonal) {
      router.push('/settings');
    }
  }, [isLoading, organization, router]);

  // Show loading or nothing while redirecting
  if (isLoading || isSwitchingOrganization || organization?.isPersonal) {
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
};

export default OrganizationSettingsPage;
