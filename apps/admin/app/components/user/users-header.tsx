import { Button } from '@repo/design';
import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';

export function UsersHeader({ filteredCount }: { filteredCount: number }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">
          {filteredCount} {filteredCount === 1 ? 'user' : 'users'} found
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard/users/new">
          <PlusIcon className="h-4 w-4" />
          Add User
        </Link>
      </Button>
    </div>
  );
}
