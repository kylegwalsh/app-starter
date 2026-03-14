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
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { Link } from 'react-router';

import type { User } from '../../lib/auth-client';

type SortField = 'email' | 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const UserStatusBadge = ({ user }: { user: User }) => {
  if (user.banned) {
    return <Badge variant="destructive">Banned</Badge>;
  }
  if (user.emailVerified) {
    return <Badge variant="default">Active</Badge>;
  }
  return <Badge variant="secondary">Unverified</Badge>;
};

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export function UsersTable({
  users,
  sortField,
  sortOrder,
  onSort,
}: {
  users: User[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
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

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button onClick={() => onSort('email')} className="flex items-center gap-1">
                User
                <SortIndicator field="email" />
              </button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>
              <button onClick={() => onSort('createdAt')} className="flex items-center gap-1">
                Created
                <SortIndicator field="createdAt" />
              </button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
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
                <TableCell className="text-muted-foreground text-sm">
                  {user.role || 'user'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/users/${user.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
