import { AuthView } from '@daveyplate/better-auth-ui';
import { authViewPaths } from '@daveyplate/better-auth-ui/server';
import { notFound } from 'next/navigation';

export const dynamicParams = false;

/** Generate all possible route parameters for authentication pages (for static generation) */
export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

/** Handles all of our authentication routes */
export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!Object.values(authViewPaths).includes(path)) {
    notFound();
  }
  return (
    <main className="container flex grow flex-col items-center justify-center gap-3 self-center p-0">
      <AuthView pathname={path} />
    </main>
  );
}
