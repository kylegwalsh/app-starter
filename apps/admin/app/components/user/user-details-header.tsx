import { Button } from '@repo/design';
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react';
import { Link } from 'react-router';

export function UserDetailsHeader({
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/users">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>
      <div className="flex items-center gap-2">
        {!isEditing ? (
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
