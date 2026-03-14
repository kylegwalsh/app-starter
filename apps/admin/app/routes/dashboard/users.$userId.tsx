import { Alert, AlertDescription, Card, CardContent, Skeleton } from '@repo/design';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import {
  UserActionsPanel,
  UserDetailsCard,
  UserDetailsHeader,
  UserSessionsPanel,
} from '../../components/user';
import { adminApi, type Session, type User } from '../../lib/auth-client';

export function meta() {
  return [
    { title: 'User Details - Better Auth Admin' },
    { name: 'description', content: 'View and manage user details' },
  ];
}

export default function UserDetailPage() {
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: 'user' | 'admin';
    emailVerified: boolean;
  }>({ name: '', email: '', role: 'user', emailVerified: false });
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);
        setError(null);
        const { data, error: apiError } = await adminApi.listUsers({
          query: {
            filterField: 'id',
            filterValue: userId,
            filterOperator: 'eq',
            limit: 1,
          },
        });

        if (apiError || !data) {
          throw new Error(apiError?.message || 'Failed to fetch user');
        }

        if (data.users.length === 0) {
          throw new Error('User not found');
        }

        const fetchedUser = data.users[0] as User;
        setUser(fetchedUser);
        setEditForm({
          name: fetchedUser.name || '',
          email: fetchedUser.email,
          role: (fetchedUser.role as 'user' | 'admin') || 'user',
          emailVerified: fetchedUser.emailVerified,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;

    try {
      setIsSaving(true);
      const { error: updateError } = await adminApi.updateUser({
        userId,
        data: {
          name: editForm.name,
          email: editForm.email,
          emailVerified: editForm.emailVerified,
        },
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update user');
      }

      // Update role if changed
      if (editForm.role !== user?.role) {
        const { error: roleError } = await adminApi.setRole({
          userId,
          role: editForm.role,
        });

        if (roleError) {
          throw new Error(roleError.message || 'Failed to update role');
        }
      }

      // Refetch user to get updated data
      const { data: refreshData } = await adminApi.listUsers({
        query: {
          filterField: 'id',
          filterValue: userId,
          filterOperator: 'eq',
          limit: 1,
        },
      });

      if (refreshData && refreshData.users.length > 0) {
        setUser(refreshData.users[0] as User);
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchUserSessions = async () => {
    if (!userId) return;

    try {
      setIsLoadingSessions(true);
      const { data, error: sessionsError } = await adminApi.listUserSessions({
        userId,
      });

      if (sessionsError) {
        throw new Error(sessionsError.message || 'Failed to fetch sessions');
      }

      setSessions((data?.sessions as Session[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionToken: string) => {
    try {
      setActionLoading(`revoke-${sessionToken}`);
      const { error: revokeError } = await adminApi.revokeUserSession({
        sessionToken,
      });

      if (revokeError) {
        throw new Error(revokeError.message || 'Failed to revoke session');
      }

      setSessions((prev) => prev.filter((s) => s.token !== sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!userId) return;

    try {
      setActionLoading('revoke-all');
      const { error: revokeError } = await adminApi.revokeUserSessions({
        userId,
      });

      if (revokeError) {
        throw new Error(revokeError.message || 'Failed to revoke all sessions');
      }

      setSessions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke all sessions');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">User Details</h1>
        <Alert variant="destructive">
          <AlertDescription>{error || 'User not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserDetailsHeader
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onCancel={() => {
          setIsEditing(false);
          setEditForm({
            name: user.name || '',
            email: user.email,
            role: (user.role as 'user' | 'admin') || 'user',
            emailVerified: user.emailVerified,
          });
        }}
        onSave={handleSave}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <UserDetailsCard
            user={user}
            isEditing={isEditing}
            editForm={editForm}
            onEditFormChange={setEditForm}
          />

          <UserSessionsPanel
            sessions={sessions}
            isLoading={isLoadingSessions}
            actionLoading={actionLoading}
            onRefresh={fetchUserSessions}
            onRevokeSession={handleRevokeSession}
            onRevokeAll={handleRevokeAllSessions}
          />
        </div>

        <div>
          <UserActionsPanel user={user} onError={setError} />
        </div>
      </div>
    </div>
  );
}
