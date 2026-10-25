'use client';

import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import { config } from '@repo/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { auth } from '@/core';

/** The provider for our Better Auth authentication */
export const AuthProvider: FC = ({ children }) => {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={auth}
      baseURL={config.app.url}
      navigate={(...args) => router.push(...args)}
      replace={(...args) => router.replace(...args)}
      Link={Link}
      credentials={{
        forgotPassword: !!config.posthog.email.templates.resetPassword,
      }}
      // Clear router cache (protected routes)
      onSessionChange={() => {
        router.refresh();
      }}
      // Add some custom paths for our auth routes because we manage our own settings pages
      account={{ basePath: '/' }}
      organization={{ basePath: '/settings', viewPaths: { SETTINGS: 'organization' } }}
    >
      {children}
    </AuthUIProvider>
  );
};
