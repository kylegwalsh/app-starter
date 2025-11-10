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
      account={{ basePath: '/' }}
      authClient={auth}
      baseURL={config.app.url}
      credentials={{
        forgotPassword: !!config.loops.transactional.resetPassword,
      }}
      Link={Link}
      navigate={(...args) => router.push(...args)}
      // Clear router cache (protected routes)
      onSessionChange={() => {
        router.refresh();
      }}
      // Add some custom paths for our auth routes because we manage our own settings pages
      organization={{
        basePath: '/settings',
        viewPaths: { SETTINGS: 'organization' },
      }}
      replace={(...args) => router.replace(...args)}
    >
      {children}
    </AuthUIProvider>
  );
};
