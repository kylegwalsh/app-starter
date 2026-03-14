import { Button } from '@repo/design';
import { LayoutDashboardIcon, LogInIcon, ShieldCheckIcon } from 'lucide-react';
import { Link } from 'react-router';

export function meta() {
  return [
    { title: 'Better Auth Admin Dashboard' },
    { name: 'description', content: 'Admin dashboard for user management' },
  ];
}

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <div className="text-center">
        <div className="bg-primary mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
          <ShieldCheckIcon className="text-primary-foreground h-10 w-10" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-white">Better Auth Dashboard</h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-gray-400">
          A comprehensive admin panel for managing users with Better Auth
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild>
            <Link to="/login">
              <LogInIcon className="h-4 w-4" />
              Admin Login
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/dashboard">
              <LayoutDashboardIcon className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
