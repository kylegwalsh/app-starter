'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/design';
import { format } from '@repo/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BuildingIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { DataTablePagination } from '@/components/data-table-pagination';
import { OrganizationDialog } from '@/components/organizations/organization-dialog';
import {
  ManagementRestrictedHeader,
  OrganizationPluginDisabledCard,
} from '@/components/organizations/organization-plugin-disabled';
import { organizationApi, type Organization } from '@/core/auth';

type SortField = 'name' | 'slug' | 'createdAt';
type SortOrder = 'asc' | 'desc';

type OrganizationWithMemberCount = Organization & {
  memberCount?: number;
};

/**
 * Organizations list — fetches all orgs with member counts, supports client-side search,
 * column sorting, and pagination. Falls back to a "plugin disabled" card on API errors.
 */
export default function OrganizationsListPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithMemberCount[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<OrganizationWithMemberCount[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch all orgs then enrich each with a member count via a parallel getFullOrganization call
  const fetchOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: apiError } = await organizationApi.list();

      if (apiError || !data) {
        throw new Error(apiError?.message || 'Failed to fetch organizations');
      }

      const orgsWithCounts = await Promise.all(
        data.map(async (org) => {
          try {
            const { data: fullOrg } = await organizationApi.getFullOrganization({
              query: { organizationId: org.id },
            });
            return {
              ...org,
              memberCount: fullOrg?.members?.length || 0,
            };
          } catch {
            return { ...org, memberCount: 0 };
          }
        }),
      );

      setOrganizations(orgsWithCounts);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Re-derive the displayed list whenever source data, search query, or sort state changes
  useEffect(() => {
    let result = [...organizations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (org) => org.name?.toLowerCase().includes(query) || org.slug?.toLowerCase().includes(query),
      );
    }

    result.sort((a, b) => {
      let aVal: string | Date = '';
      let bVal: string | Date = '';

      switch (sortField) {
        case 'name': {
          aVal = a.name;
          bVal = b.name;
          break;
        }
        case 'slug': {
          aVal = a.slug;
          bVal = b.slug;
          break;
        }
        case 'createdAt': {
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        }
      }

      if (aVal < bVal) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredOrganizations(result);
    setCurrentPage(1);
  }, [organizations, searchQuery, sortField, sortOrder]);

  // Toggle sort direction when clicking the same column, or switch to ascending on a new column
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const paginatedOrganizations = filteredOrganizations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);

  const sortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDownIcon className="ml-1 size-3.5 opacity-50" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUpIcon className="ml-1 size-3.5" />;
    }
    return <ArrowDownIcon className="ml-1 size-3.5" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header: title + button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-9 w-40" />
        </div>

        {/* Search */}
        <Skeleton className="h-9 w-full" />

        {/* Table */}
        <Card>
          <div className="p-4">
            {/* Table header */}
            <div className="flex items-center gap-4 border-b pb-3">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="hidden h-8 w-14 sm:block" />
              <Skeleton className="hidden h-4 w-20 md:block" />
              <Skeleton className="hidden h-8 w-20 sm:block" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b py-3 last:border-0">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
                <Skeleton className="hidden h-4 w-8 md:block" />
                <Skeleton className="hidden h-4 w-24 sm:block" />
              </div>
            ))}
          </div>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ManagementRestrictedHeader title="Organizations" />
        <OrganizationPluginDisabledCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusIcon className="h-4 w-4" />
          Add Organization
        </Button>
      </div>
      <OrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSaved={fetchOrganizations}
      />

      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name or slug..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('name')}
                >
                  Name
                  {sortIcon('name')}
                </Button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('slug')}
                >
                  Slug
                  {sortIcon('slug')}
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Members</TableHead>
              <TableHead className="hidden sm:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('createdAt')}
                >
                  Created
                  {sortIcon('createdAt')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrganizations.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BuildingIcon className="text-muted-foreground/50 size-12" />
                    <p className="text-muted-foreground">No organizations found</p>
                    {searchQuery && (
                      <Button variant="link" size="sm" onClick={() => setSearchQuery('')}>
                        Clear search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrganizations.map((org) => (
                <TableRow
                  key={org.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 rounded-lg">
                        <AvatarImage src={org.logo ?? undefined} alt={org.name} />
                        <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-sm font-semibold">
                          {org.name?.slice(0, 2).toUpperCase() ?? '??'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="font-mono">
                      {org.slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                    {org.memberCount || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                    {format.date(new Date(org.createdAt))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredOrganizations.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(perPage) => {
          setItemsPerPage(perPage);
          setCurrentPage(1);
        }}
        label="organizations"
      />
    </div>
  );
}
