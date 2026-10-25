'use client';

import { UserInvitationsCard } from '@daveyplate/better-auth-ui';
import { config } from '@repo/config';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/design';
import { useMutation } from '@tanstack/react-query';
import { Building2, Check } from 'lucide-react';
import { useMemo } from 'react';

import { useUser } from '@/hooks';
import { api, auth } from '@/lib';

/** Access requests go through the contact endpoint, which needs a support inbox and an email template */
const canRequestAccess = !!(
  config.app.supportEmail && config.posthog.email.templates.contactFormSubmission
);

/** Displayed when a signed in user doesn't belong to any organization */
export const NoOrganizationState = () => {
  const { user } = useUser();
  // Requests go to the support inbox through the contact endpoint
  const requestAccess = useMutation(api.contact.$post.mutationOptions());

  const handleRequestAccess = () => {
    if (!user) {
      return;
    }
    requestAccess.mutate({
      json: {
        name: user.name,
        email: user.email,
        message: '[Access request] Signed in to app without an organization.',
      },
    });
  };

  const handleSignOut = async () => {
    await auth.signOut();
  };

  /** Explains the next steps available to the user */
  const description = useMemo(() => {
    if (requestAccess.isSuccess) {
      return `We'll be in touch at ${user?.email ?? 'your email'} soon.`;
    }
    if (canRequestAccess) {
      return 'Request access and we’ll get you set up, or ask an organization admin to invite you. Pending invitations appear below.';
    }
    return 'Ask an organization admin to invite you. Pending invitations appear below.';
  }, [requestAccess.isSuccess, user?.email]);

  return (
    <div className="bg-muted/50 flex min-h-screen w-full flex-col items-center justify-center gap-4 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            {requestAccess.isSuccess ? (
              <Check className="text-primary h-6 w-6" />
            ) : (
              <Building2 className="text-primary h-6 w-6" />
            )}
          </div>
          <CardTitle className="wrap-break-word">
            {requestAccess.isSuccess ? 'Request sent' : 'No organization found'}
          </CardTitle>
          <CardDescription className="wrap-break-word">{description}</CardDescription>
        </CardHeader>

        {!requestAccess.isSuccess && canRequestAccess && (
          <CardContent className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={requestAccess.isPending || !user}
              loading={requestAccess.isPending}
              onClick={handleRequestAccess}
            >
              Request access
            </Button>
            {requestAccess.isError && (
              <p className="text-destructive text-center text-xs" role="alert">
                Something went wrong. Please try again or email us at {config.app.supportEmail}.
              </p>
            )}
          </CardContent>
        )}

        <CardFooter className="flex justify-center">
          <Button className="h-auto p-0 text-xs" onClick={handleSignOut} size="sm" variant="link">
            Sign out
          </Button>
        </CardFooter>
      </Card>

      {/* Accepting an invitation refreshes the session, which swaps this screen for the app */}
      <UserInvitationsCard className="w-full max-w-md" />
    </div>
  );
};
