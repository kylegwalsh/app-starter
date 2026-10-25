'use client';

import { AuthView } from '@daveyplate/better-auth-ui';
import { useSearchParams } from 'next/navigation';

/** Renders the better-auth-ui pre-built views for auth flows */
export const AuthPageView = ({ path }: { path: string }) => {
  // We handle the invitations manually because they end up getting lost
  // if a user needs to create an account vs sign in
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('invitationId');
  const redirectTo =
    invitationId && !searchParams.has('redirectTo')
      ? `/auth/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`
      : undefined;

  return <AuthView pathname={path} redirectTo={redirectTo} />;
};
