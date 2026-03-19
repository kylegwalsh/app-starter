import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/design';
import { format } from '@repo/utils';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { User } from '@/core/auth';

type SortField = 'email' | 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const UserStatusBadge = ({ user }: { user: User }) => {
  if (user.banned) {
    return (
      <Badge variant="outline" className="text-destructive border-destructive/50">
        Banned
      </Badge>
    );
  }
  if (user.emailVerified) {
    return <Badge variant="default">Active</Badge>;
  }
  return <Badge variant="secondary">Unverified</Badge>;
};

const sortIcon = (field: SortField, sortField: SortField, sortOrder: SortOrder) => {
  if (sortField !== field) {
    return <ChevronsUpDownIcon className="ml-1 size-3.5 opacity-50" />;
  }
  if (sortOrder === 'asc') {
    return <ArrowUpIcon className="ml-1 size-3.5" />;
  }
  return <ArrowDownIcon className="ml-1 size-3.5" />;
};

export const UsersTable = ({
  users,
  sortField,
  sortOrder,
  onSort,
}: {
  users: User[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) => {
  const router = useRouter();

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort('email')}
              >
                User
                {sortIcon('email', sortField, sortOrder)}
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Role</TableHead>
            <TableHead className="hidden sm:table-cell">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort('createdAt')}
              >
                Created
                {sortIcon('createdAt', sortField, sortOrder)}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <UsersIcon className="text-muted-foreground/50 size-12" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/dashboard/users/${user.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? ''} />
                      <AvatarFallback>
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.name || 'No name'}</p>
                      <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <UserStatusBadge user={user} />
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                  {user.role || 'user'}
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                  {format.date(new Date(user.createdAt))}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
