import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/design';
import { ArrowDownIcon, ArrowUpIcon, BuildingIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';

import {
  ManagementRestrictedHeader,
  OrganizationPluginDisabledCard,
} from '../../components/organisations/organization-plugin-disabled';
import { organizationApi, type Organization } from '../../lib/auth-client';

export function meta() {
  return [
    { title: 'Organizations - Better Auth Admin' },
    { name: 'description', content: 'Manage organizations' },
  ];
}

type SortField = 'name' | 'slug' | 'createdAt';
type SortOrder = 'asc' | 'desc';

type OrganizationWithMemberCount = Organization & {
  memberCount?: number;
};

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function OrganizationsListPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithMemberCount[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<OrganizationWithMemberCount[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all organizations (admin view)
      const { data, error: apiError } = await organizationApi.list();

      if (apiError || !data) {
        throw new Error(apiError?.message || 'Failed to fetch organizations');
      }

      // Fetch member counts for each organization
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

  // Filter and sort organizations
  useEffect(() => {
    let result = [...organizations];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (org) => org.name.toLowerCase().includes(query) || org.slug.toLowerCase().includes(query),
      );
    }

    // Apply sorting
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

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return null;
    }
    return sortOrder === 'asc' ? (
      <ArrowUpIcon className="h-3 w-3" />
    ) : (
      <ArrowDownIcon className="h-3 w-3" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1">Manage organizations</p>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            {filteredOrganizations.length}{' '}
            {filteredOrganizations.length === 1 ? 'organization' : 'organizations'} found
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/organizations/new">
            <PlusIcon className="h-4 w-4" />
            Add Organization
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                  Name
                  <SortIndicator field="name" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort('slug')} className="flex items-center gap-1">
                  Slug
                  <SortIndicator field="slug" />
                </button>
              </TableHead>
              <TableHead>Members</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1">
                  Created
                  <SortIndicator field="createdAt" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrganizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BuildingIcon className="text-muted-foreground/50 h-12 w-12" />
                    <p>No organizations found</p>
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
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={org.logo ?? undefined} alt={org.name} />
                        <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-sm font-semibold">
                          {org.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        to={`/dashboard/organizations/${org.id}`}
                        className="text-foreground hover:text-primary font-medium"
                      >
                        {org.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {org.slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {org.memberCount || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(org.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/dashboard/organizations/${org.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredOrganizations.length)} of{' '}
            {filteredOrganizations.length} organizations
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
