import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';

import { UsersFilters, UsersTable } from '~/components/user';
import { adminApi, type AdminUser } from '~/lib/auth-client';

/** User list page with search, filter, sort, and pagination */
const UsersIndex = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listUsers({
        query: {
          limit,
          offset,
          sortBy,
          sortDirection,
          ...(search
            ? { searchField: 'email', searchValue: search, searchOperator: 'contains' as const }
            : {}),
          ...(statusFilter === 'banned'
            ? { filterField: 'banned', filterValue: 'true' }
            : statusFilter === 'active'
              ? { filterField: 'banned', filterValue: 'false' }
              : {}),
        },
      });
      if (result.data?.users) {
        setUsers(result.data.users as AdminUser[]);
      }
    } catch {
      // Keep existing users on error
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortDirection, offset]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [search, statusFilter]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage application users.</p>
        </div>
        <Link
          to="/dashboard/users/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add User
        </Link>
      </div>

      <div className="mt-6">
        <UsersFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          </div>
        ) : (
          <UsersTable
            users={users}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
          disabled={offset === 0}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-500">
          Showing {offset + 1}–{offset + users.length}
        </span>
        <button
          onClick={() => setOffset((o) => o + limit)}
          disabled={users.length < limit}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default UsersIndex;
