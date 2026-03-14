import { useEffect, useState } from 'react';

import { StatsCard } from '~/components/stats-card';
import { adminApi, type AdminUser } from '~/lib/auth-client';

/** Dashboard overview with user stats */
const DashboardIndex = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await adminApi.listUsers({ query: { limit: 500 } });
        if (result.data?.users) {
          setUsers(result.data.users as AdminUser[]);
        }
      } catch {
        // Stats will show 0
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.banned).length;
  const bannedUsers = users.filter((u) => u.banned).length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Overview of your application users.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Users" value={totalUsers} color="blue" />
        <StatsCard title="Active Users" value={activeUsers} color="green" />
        <StatsCard title="Banned Users" value={bannedUsers} color="red" />
        <StatsCard title="Admins" value={adminUsers} color="yellow" />
      </div>
    </div>
  );
};

export default DashboardIndex;
