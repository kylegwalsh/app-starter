'use client';

import { Alert, AlertDescription, Card, CardContent, Skeleton } from '@repo/design';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  EditUserDialog,
  UserActionsPanel,
  UserDetailsCard,
  UserDetailsHeader,
  UserSessionsPanel,
} from '@/components/user';
import { adminApi, type Session, type User } from '@/core/auth';

/**
 * User detail page — view user profile, manage sessions (view/revoke), and perform
 * admin actions (ban, unban, delete, set password, impersonate). Edit opens a modal.
 */
export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Fetch the specific user by ID using the admin listUsers filter API
  const fetchUser = useCallback(async () => {
    if (!userId) {
      return;
    }

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

      setUser(data.users[0] as User);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Load active sessions for this user so they can be reviewed or revoked
  const fetchUserSessions = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setIsLoadingSessions(true);
      const { data, error: sessionsError } = await adminApi.listUserSessions({
        userId,
      });

      if (sessionsError) {
        throw new Error(sessionsError.message || 'Failed to fetch sessions');
      }

      setSessions((data?.sessions as Session[]) || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  }, [userId]);

  // Fetch sessions on mount
  useEffect(() => {
    fetchUserSessions();
  }, [fetchUserSessions]);

  // Revoke a single session by token and remove it from local state
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke session');
    } finally {
      setActionLoading(null);
    }
  };

  // Revoke every session for this user in one API call and clear local session state
  const handleRevokeAllSessions = async () => {
    if (!userId) {
      return;
    }

    try {
      setActionLoading('revoke-all');
      const { error: revokeError } = await adminApi.revokeUserSessions({
        userId,
      });

      if (revokeError) {
        throw new Error(revokeError.message || 'Failed to revoke all sessions');
      }

      setSessions([]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke all sessions');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header: back + title + edit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-9 w-16" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* User details card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <Skeleton className="size-20 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-44" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-44" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sessions card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="mt-4 h-4 w-36" />
              </CardContent>
            </Card>
          </div>

          {/* Actions sidebar */}
          <Card>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
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
      <UserDetailsHeader onEdit={() => setShowEditDialog(true)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <UserDetailsCard user={user} />

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
          <UserActionsPanel user={user} onError={setError} onUserChanged={fetchUser} />
        </div>
      </div>

      <EditUserDialog
        user={user}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSaved={setUser}
      />
    </div>
  );
}
