'use client';

import { analytics } from '@repo/analytics';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { storage } from '@/core';
import { useUser } from '@/hooks';

/** Watches user changes and performs tasks */
export const UserInitializer = () => {
  const queryClient = useQueryClient();
  const { user, organization, isLoading, isLoggedIn } = useUser();
  const [previouslyIdentified, setPreviouslyIdentified] = useState(false);
  const [previousOrganizationId, setPreviousOrganizationId] = useState<string>();

  // Once the user becomes defined, identify them
  useEffect(() => {
    if (isLoggedIn && !previouslyIdentified) {
      // Mark the user as previously identified until they logout
      setPreviouslyIdentified(true);

      // If the user exists, identify them on load and set their last active time
      if (user?.id) {
        analytics.identify({
          userId: user.id,
          traits: {
            email: user.email,
            name: user.name,
            createdAt: user.createdAt?.toISOString() ?? undefined,
          },
        });
      }
    }
    // If the user logs out, reset their previously identified state
    else if (!isLoggedIn && previouslyIdentified) {
      setPreviouslyIdentified(false);
      setPreviousOrganizationId(undefined);
    }
  }, [isLoggedIn, user, previouslyIdentified]);

  // Whenever the organization changes, identify it
  useEffect(() => {
    if (isLoggedIn && organization?.id && organization.id !== previousOrganizationId) {
      setPreviousOrganizationId(organization.id);
      analytics.organizationIdentify({
        organizationId: organization.id,
        traits: {
          name: organization.name,
          createdAt: organization.createdAt?.toISOString() ?? undefined,
        },
      });

      // Invalidate all queries when switching organizations to ensure fresh data
      if (previousOrganizationId) {
        queryClient.invalidateQueries();
      }
    }
  }, [isLoggedIn, organization, previousOrganizationId, queryClient]);

  // Once the user logs in, store something indicating that they had a session at some point (used to detect session expiration)
  useEffect(() => {
    if (isLoggedIn) {
      /** Check whether they previously had a session */
      const previousSessionExisted = !!storage.get('sessionExisted');

      // If the user has just logged in, track it
      if (!previousSessionExisted) {
        analytics.userSignedIn({});
      }

      // We track whether a previous session existed in order to clear some data below
      storage.set('sessionExisted', 'true');
    }
  }, [isLoggedIn]);

  // If the user signs out (or their session expires), handle some additional logic to purge their data
  useEffect(() => {
    /** Check whether they previously had a session and whether we already ran this logic */
    const previousSessionExisted = !!storage.get('sessionExisted');

    // Verify all conditions are met that indicate a session expired
    if (!(isLoading || isLoggedIn) && previousSessionExisted) {
      console.log('[UserInitializer] User logged out... clearing data');

      // Mark their session as having been cleared
      storage.delete('sessionExisted');

      // Reset all queries
      queryClient.clear();

      // Track sign out
      analytics.userSignedOut({});
    }
  }, [isLoading, isLoggedIn, queryClient]);

  // Don't render any UI elements
  return null;
};
