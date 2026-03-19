import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the dashboard. RequireAdmin in the dashboard layout
 * handles sending unauthenticated users to login.
 */
export default function HomePage() {
  redirect('/dashboard');
}
