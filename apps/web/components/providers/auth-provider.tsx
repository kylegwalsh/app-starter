'use client';

import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import { config } from '@repo/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { auth } from '@/core';

/** The provider for our Better Auth authentication */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={auth}
      baseURL={config.app.url}
      navigate={(...args) => router.push(...args)}
      replace={(...args) => router.replace(...args)}
      Link={Link}
      credentials={{
        forgotPassword: !!config.loops.transactional.resetPassword,
      }}
      // Clear router cache (protected routes)
      onSessionChange={() => {
        router.refresh();
      }}
      // Add some custom paths for our auth routes because we manage our own settings pages
      settings={{ basePath: '/settings' }}
      viewPaths={{
        SETTINGS: '',
        MEMBERS: 'organization',
        ORGANIZATION: 'organization',
        ORGANIZATIONS: 'organization',
        SECURITY: 'account',
      }}>
      {children}
    </AuthUIProvider>
  );
};
