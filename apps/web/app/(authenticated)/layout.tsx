'use client';

import { AuthLoading, RedirectToSignIn, SignedIn } from '@daveyplate/better-auth-ui';
import { LoadingLayout } from '@repo/design';

import { AppSidebar, NoOrganizationState } from '@/components';
import { ChatProvider } from '@/components/chat';
import { auth } from '@/lib';

/** Renders the app once the user is signed in */
const SignedInContent: FC = ({ children }) => {
  const { data, isPending } = auth.useSession();

  // Wait until we're done loading the session
  if (isPending) {
    return <LoadingLayout />;
  }

  // Only reachable when personal organizations are disabled and the user hasn't joined one yet
  if (!data?.session.activeOrganizationId) {
    return <NoOrganizationState />;
  }

  return (
    <ChatProvider>
      <AppSidebar>{children}</AppSidebar>
    </ChatProvider>
  );
};

/** The layout for the dashboard (enforce authentication) */
const RootLayout: FC = ({ children }) => {
  // When signed in, render our app
  return (
    <>
      {/* Redirect to the sign in page if the user is not signed in */}
      <RedirectToSignIn />

      {/* Show a loading state while we wait for the user to be authenticated */}
      <AuthLoading>
        <LoadingLayout />
      </AuthLoading>

      {/* Once logged in, render our app */}
      <SignedIn>
        <SignedInContent>{children}</SignedInContent>
      </SignedIn>
    </>
  );
};

export default RootLayout;
