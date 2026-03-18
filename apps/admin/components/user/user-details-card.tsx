import { Avatar, AvatarFallback, AvatarImage, Badge, Card, CardContent } from '@repo/design';
import { format } from '@repo/utils';

import type { User } from '@/core/auth';

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

export const UserDetailsCard = ({ user }: { user: User }) => {
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
                <p>{format.date(new Date(user.createdAt), 'MMMM D, YYYY h:mm A')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p>{format.date(new Date(user.updatedAt), 'MMMM D, YYYY h:mm A')}</p>
              </div>
              {user.banned && user.banReason && (
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Ban Reason</p>
                  <p className="text-destructive">{user.banReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
