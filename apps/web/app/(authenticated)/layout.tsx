'use client';

import { AuthLoading, RedirectToSignIn, SignedIn } from '@daveyplate/better-auth-ui';
import { LoadingLayout } from '@repo/design';
import React from 'react';

import { AppSidebar } from '@/components';

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
        <AppSidebar>{children}</AppSidebar>
      </SignedIn>
    </>
  );
};

export default RootLayout;
