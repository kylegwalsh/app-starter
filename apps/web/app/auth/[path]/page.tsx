import { authViewPaths } from '@daveyplate/better-auth-ui/server';
import { notFound } from 'next/navigation';

import { AuthView } from './view';

// We only want to keep the basic auth pages (we will do something custom for settings pages)
const supportedPaths = [
  authViewPaths.ACCEPT_INVITATION,
  authViewPaths.CALLBACK,
  authViewPaths.EMAIL_OTP,
  authViewPaths.FORGOT_PASSWORD,
  authViewPaths.MAGIC_LINK,
  authViewPaths.RECOVER_ACCOUNT,
  authViewPaths.RESET_PASSWORD,
  authViewPaths.SIGN_IN,
  authViewPaths.SIGN_OUT,
  authViewPaths.SIGN_UP,
  authViewPaths.TWO_FACTOR,
];

/** Generate all possible route parameters for authentication pages (for static generation) */
export function generateStaticParams() {
  return supportedPaths.map((path) => ({ path }));
}

/** Handles all of our authentication routes */
export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!supportedPaths.includes(path)) notFound();
  return <AuthView path={path} />;
}
