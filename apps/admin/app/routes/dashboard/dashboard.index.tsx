import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/design';
import {
  AlertCircleIcon,
  BanIcon,
  CheckCircleIcon,
  MailWarningIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { adminApi } from '../../lib/auth-client';

export function meta() {
  return [
    { title: 'Dashboard - Better Auth Admin' },
    { name: 'description', content: 'Admin dashboard overview' },
  ];
}

type Stats = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  unverifiedUsers: number;
};

const statCards = [
  { key: 'totalUsers' as const, name: 'Total Users', icon: UsersIcon },
  { key: 'activeUsers' as const, name: 'Active Users', icon: CheckCircleIcon },
  { key: 'bannedUsers' as const, name: 'Banned Users', icon: BanIcon },
  { key: 'unverifiedUsers' as const, name: 'Unverified Users', icon: MailWarningIcon },
];

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const { data, error: apiError } = await adminApi.listUsers({
          query: { limit: 1000 },
        });

        if (apiError || !data) {
          throw new Error(apiError?.message || 'Failed to fetch users');
        }

        const users = data.users as { banned?: boolean; emailVerified?: boolean }[];
        setStats({
          totalUsers: data.total || users.length,
          activeUsers: users.filter((u) => !u.banned && u.emailVerified).length,
          bannedUsers: users.filter((u) => u.banned).length,
          unverifiedUsers: users.filter((u) => !u.emailVerified).length,
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to the admin dashboard</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.[stat.key] ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/dashboard/users">
              <UsersIcon className="h-4 w-4" />
              View All Users
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/users/new">
              <UserPlusIcon className="h-4 w-4" />
              Add New User
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
