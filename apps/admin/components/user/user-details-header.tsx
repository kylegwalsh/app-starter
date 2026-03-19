import { Button } from '@repo/design';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

export const UserDetailsHeader = ({ onEdit }: { onEdit: () => void }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/users">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>
      <Button variant="outline" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
};
