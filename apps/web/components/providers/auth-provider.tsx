'use client';

import { AuthUIProvider } from '@daveyplate/better-auth-ui';
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
      navigate={(...args) => router.push(...args)}
      replace={(...args) => router.replace(...args)}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      Link={Link}>
      {children}
    </AuthUIProvider>
  );
};
