import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { UserActionsPanel } from '~/components/user';
import { adminApi, type AdminUser, type UserSession } from '~/lib/auth-client';

/** User detail page — view, edit, manage sessions, and perform actions */
const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    try {
      // Fetch user details via list with ID filter
      const result = await adminApi.listUsers({
        query: {
          searchField: 'id',
          searchValue: userId,
          searchOperator: 'is' as const,
          limit: 1,
        },
      });
      const found = (result.data?.users as AdminUser[])?.[0];
      if (found) {
        setUser(found);
        setName(found.name || '');
        setRole(found.role || 'user');
      }

      // Fetch sessions
      const sessionsResult = await adminApi.listUserSessions({ userId });
      if (sessionsResult.data?.sessions) {
        setSessions(sessionsResult.data.sessions as UserSession[]);
      }
    } catch {
      // User not found
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await adminApi.updateUser({ userId, data: { name } });
      if (role !== user?.role) {
        await adminApi.setRole({ userId, role });
      }
      setEditing(false);
      fetchUser();
    } catch {
      // Keep editing state on error
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionToken: string) => {
    await adminApi.revokeUserSession({ sessionToken });
    fetchUser();
  };

  const handleRevokeAllSessions = async () => {
    if (!userId) return;
    await adminApi.revokeUserSessions({ userId });
    fetchUser();
  };

  const handleAction = () => {
    fetchUser();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-gray-500">User not found.</p>
        <Link to="/dashboard/users" className="mt-2 text-blue-600 hover:text-blue-800">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/dashboard/users" className="text-sm text-blue-600 hover:text-blue-800">
            &larr; Back to Users
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{user.name || user.email}</h1>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User info / edit form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    id="edit-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setName(user.name || '');
                      setRole(user.role || 'user');
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{user.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role || 'user'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd>
                    {user.banned ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                        Banned{user.banReason ? `: ${user.banReason}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        Active
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
                  <dd className="text-sm text-gray-900">{user.emailVerified ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">{new Date(user.createdAt).toLocaleString()}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Sessions */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sessions ({sessions.length})</h3>
              {sessions.length > 0 && (
                <button
                  onClick={handleRevokeAllSessions}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Revoke All
                </button>
              )}
            </div>
            {sessions.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No active sessions.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-3 text-sm"
                  >
                    <div>
                      <p className="text-gray-700">{session.userAgent || 'Unknown device'}</p>
                      <p className="text-xs text-gray-400">
                        {session.ipAddress || 'Unknown IP'} · Expires{' '}
                        {new Date(session.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(session.token)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions sidebar */}
        <div>
          <UserActionsPanel
            userId={user.id}
            isBanned={user.banned}
            onAction={handleAction}
          />
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
