import '@repo/design/globals.css';

import { Toaster } from '@repo/design';
import { createMetadata } from '@repo/seo';
import type { ReactNode } from 'react';

import { ErrorBoundary, Providers, UserInitializer } from '@/components';

/** The default metadata for the app */
export const metadata = createMetadata();

/** Our primary layout wrapping the entire app */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-svh flex-col antialiased">
        <ErrorBoundary>
          <Providers>
            {children}
            <UserInitializer />
            <Toaster />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
