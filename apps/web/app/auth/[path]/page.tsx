import { authViewPaths } from '@daveyplate/better-auth-ui/server';

import { AuthView } from './view';

/** Generate all possible route parameters for authentication pages (for static generation) */
export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

/** Handles all of our authentication routes */
export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  return <AuthView path={path} />;
}
