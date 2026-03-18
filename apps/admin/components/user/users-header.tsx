import { Button } from '@repo/design';
import { PlusIcon } from 'lucide-react';

export const UsersHeader = ({ onAddUser }: { onAddUser: () => void }) => {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <h1 className="text-2xl font-bold">Users</h1>
      <Button onClick={onAddUser}>
        <PlusIcon className="h-4 w-4" />
        Add User
      </Button>
    </div>
  );
};
