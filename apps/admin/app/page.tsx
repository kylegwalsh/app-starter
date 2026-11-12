import { redirect } from 'next/navigation';

/** Home page: redirects to the dashboard */
export default function HomePage() {
  redirect('/dashboard');
}
