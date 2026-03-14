import { Link } from 'react-router';

import type { AdminUser } from '~/lib/auth-client';

type UsersTableProps = {
  users: AdminUser[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
};

const SortHeader = ({
  label,
  field,
  sortBy,
  sortDirection,
  onSort,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}) => (
  <th
    className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700"
    onClick={() => onSort(field)}
  >
    {label}
    {sortBy === field && (
      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
    )}
  </th>
);

/** Sortable table of users */
export const UsersTable = ({ users, sortBy, sortDirection, onSort }: UsersTableProps) => {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader label="Name" field="name" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
            <SortHeader label="Email" field="email" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Role</th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Status</th>
            <SortHeader label="Created" field="createdAt" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <Link to={`/dashboard/users/${user.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                  {user.name || '—'}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{user.email}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.role || 'user'}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {user.banned ? (
                  <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                    Banned
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Active
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
