import { useState } from 'react';

import { adminApi } from '~/lib/auth-client';

type UserActionsPanelProps = {
  userId: string;
  isBanned: boolean | null;
  onAction: () => void;
};

/** Panel with ban/unban, delete, and password reset actions for a user */
export const UserActionsPanel = ({ userId, isBanned, onAction }: UserActionsPanelProps) => {
  const [banReason, setBanReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAction = async (action: string, fn: () => Promise<unknown>) => {
    setLoading(action);
    setMessage(null);
    try {
      await fn();
      setMessage({ type: 'success', text: `${action} successful` });
      onAction();
    } catch {
      setMessage({ type: 'error', text: `${action} failed` });
    } finally {
      setLoading(false as unknown as string);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Actions</h3>

      {message && (
        <div className={`rounded-md p-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Ban / Unban */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">
          {isBanned ? 'Unban User' : 'Ban User'}
        </h4>
        {!isBanned && (
          <input
            type="text"
            placeholder="Ban reason (optional)"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        )}
        <button
          onClick={() =>
            handleAction(
              isBanned ? 'Unban' : 'Ban',
              () =>
                isBanned
                  ? adminApi.unbanUser({ userId })
                  : adminApi.banUser({ userId, banReason: banReason || undefined }),
            )
          }
          disabled={loading !== null}
          className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white ${
            isBanned
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-orange-600 hover:bg-orange-700'
          } disabled:opacity-50`}
        >
          {loading === (isBanned ? 'Unban' : 'Ban') ? 'Processing...' : isBanned ? 'Unban User' : 'Ban User'}
        </button>
      </div>

      {/* Set Password */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Reset Password</h4>
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <button
          onClick={() => {
            if (!newPassword) return;
            handleAction('Set password', () =>
              adminApi.setUserPassword({ userId, newPassword }),
            );
            setNewPassword('');
          }}
          disabled={loading !== null || !newPassword}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === 'Set password' ? 'Processing...' : 'Set Password'}
        </button>
      </div>

      {/* Delete */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Delete User</h4>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete User
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() =>
                handleAction('Delete', () => adminApi.removeUser({ userId }))
              }
              disabled={loading !== null}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
