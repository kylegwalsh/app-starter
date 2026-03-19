'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DataFetchError } from '@/components/data-fetch-error';
import {
  CreateUserDialog,
  UsersFilters,
  UsersHeader,
  UsersLoadingSkeleton,
  UsersPagination,
  UsersTable,
} from '@/components/user';
import { adminApi, type User } from '@/core/auth';

type SortField = 'email' | 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'banned' | 'unverified';

/** Map our filter status to Better Auth's filterField/filterValue params */
const buildFilterParams = (status: FilterStatus) => {
  switch (status) {
    case 'banned': {
      return { filterField: 'banned', filterValue: 'true', filterOperator: 'eq' as const };
    }
    case 'unverified': {
      return {
        filterField: 'emailVerified',
        filterValue: 'false',
        filterOperator: 'eq' as const,
      };
    }
    case 'active': {
      return { filterField: 'banned', filterValue: 'false', filterOperator: 'eq' as const };
    }
    default: {
      return {};
    }
  }
};

/**
 * Users list — server-side pagination, search, sorting, and filtering via Better Auth admin API.
 */
export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Debounce search input (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch users from the API with server-side params
  const fetchUsers = useCallback(async () => {
    try {
      setError(null);

      const offset = (currentPage - 1) * itemsPerPage;
      const filterParams = buildFilterParams(filterStatus);
      const baseQuery = {
        limit: itemsPerPage,
        offset,
        sortBy: sortField,
        sortDirection: sortOrder,
        ...filterParams,
      };

      if (debouncedSearch) {
        // Search both email and name fields with high limit, then deduplicate and paginate client-side
        const searchQuery = {
          sortBy: sortField,
          sortDirection: sortOrder,
          ...filterParams,
          limit: 1000,
        };
        const [emailResult, nameResult] = await Promise.all([
          adminApi.listUsers({
            query: {
              ...searchQuery,
              searchValue: debouncedSearch,
              searchField: 'email' as const,
              searchOperator: 'contains' as const,
            },
          }),
          adminApi.listUsers({
            query: {
              ...searchQuery,
              searchValue: debouncedSearch,
              searchField: 'name' as const,
              searchOperator: 'contains' as const,
            },
          }),
        ]);

        if ((emailResult.error || !emailResult.data) && (nameResult.error || !nameResult.data)) {
          throw new Error(
            emailResult.error?.message || nameResult.error?.message || 'Failed to fetch users',
          );
        }

        const emailUsers = (emailResult.data?.users ?? []) as User[];
        const nameUsers = (nameResult.data?.users ?? []) as User[];
        const seen = new Set<string>();
        const merged: User[] = [];
        for (const user of [...emailUsers, ...nameUsers]) {
          if (!seen.has(user.id)) {
            seen.add(user.id);
            merged.push(user);
          }
        }

        const start = (currentPage - 1) * itemsPerPage;
        setUsers(merged.slice(start, start + itemsPerPage));
        setTotalItems(merged.length);
      } else {
        const { data, error: apiError } = await adminApi.listUsers({
          query: baseQuery,
        });

        if (apiError || !data) {
          throw new Error(apiError?.message || 'Failed to fetch users');
        }

        setUsers(data.users as User[]);
        setTotalItems(data.total ?? 0);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setIsInitialLoad(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, debouncedSearch, filterStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Toggle sort direction when clicking the same column, or switch to ascending on a new column
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (isInitialLoad) {
    return <UsersLoadingSkeleton />;
  }

  if (error) {
    return (
      <DataFetchError
        title="Users"
        description="Manage user accounts"
        error={error}
        onRetry={fetchUsers}
      />
    );
  }

  return (
    <div className="space-y-6">
      <UsersHeader onAddUser={() => setShowCreateDialog(true)} />
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchUsers}
      />
      <UsersFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterStatusChange={handleFilterChange}
      />
      <UsersTable users={users} sortField={sortField} sortOrder={sortOrder} onSort={toggleSort} />
      <UsersPagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(perPage) => {
          setItemsPerPage(perPage);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
