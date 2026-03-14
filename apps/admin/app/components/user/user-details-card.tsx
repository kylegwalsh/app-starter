import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design';

import type { User } from '../../lib/auth-client';

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

type EditForm = {
  name: string;
  email: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
};

const UserStatusBadge = ({ user }: { user: User }) => {
  if (user.banned) {
    return <Badge variant="destructive">Banned</Badge>;
  }
  if (user.emailVerified) {
    return <Badge variant="default">Active</Badge>;
  }
  return <Badge variant="secondary">Unverified</Badge>;
};

export function UserDetailsCard({
  user,
  isEditing,
  editForm,
  onEditFormChange,
}: {
  user: User;
  isEditing: boolean;
  editForm: EditForm;
  onEditFormChange: (form: EditForm) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <Avatar className="size-20 shrink-0">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ''} />
            <AvatarFallback className="text-2xl">
              {user.name?.[0] || user.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-6">
            {isEditing ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => onEditFormChange({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(v) =>
                      onEditFormChange({ ...editForm, role: v as 'user' | 'admin' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="emailVerified"
                    checked={editForm.emailVerified}
                    onCheckedChange={(checked) =>
                      onEditFormChange({ ...editForm, emailVerified: checked === true })
                    }
                  />
                  <Label htmlFor="emailVerified">Email Verified</Label>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-semibold">{user.name || 'No name'}</h2>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <UserStatusBadge user={user} />
                  <Badge variant="outline">{user.role || 'user'}</Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">User ID</p>
                    <p className="font-mono">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email Verified</p>
                    <p>{user.emailVerified ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p>{formatDate(user.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p>{formatDate(user.updatedAt)}</p>
                  </div>
                  {user.banned && user.banReason && (
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground">Ban Reason</p>
                      <p className="text-destructive">{user.banReason}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
