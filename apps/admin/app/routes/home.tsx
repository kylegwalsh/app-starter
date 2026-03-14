import { Link } from 'react-router';

import { useAuth } from '~/contexts/auth-context';

/** Landing page — redirects authenticated admins to dashboard */
const HomePage = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-3 text-lg text-gray-400">Manage users and monitor your application.</p>
        <div className="mt-8">
          {isAuthenticated && isAdmin ? (
            <Link
              to="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
