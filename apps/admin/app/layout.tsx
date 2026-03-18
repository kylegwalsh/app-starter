'use client';

import './globals.css';

import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/contexts/auth-context';

const inter = Inter({ subsets: ['latin'] });

/**
 * Root layout — wraps the entire app with the Inter font and AuthProvider for session state.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
