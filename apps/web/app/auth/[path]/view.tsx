'use client';

import { AuthCard } from '@daveyplate/better-auth-ui';

/** Handles various views for Better Auth out of the box */
export function AuthView({ path }: { path: string }) {
  return (
    <main className="container flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthCard pathname={path} />
    </main>
  );
}
