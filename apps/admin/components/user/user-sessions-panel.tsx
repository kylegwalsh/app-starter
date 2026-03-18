import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@repo/design';
import { format } from '@repo/utils';
import { Loader2Icon, RefreshCwIcon } from 'lucide-react';

import type { Session } from '@/core/auth';

export const UserSessionsPanel = ({
  sessions,
  isLoading,
  actionLoading,
  onRefresh,
  onRevokeSession,
  onRevokeAll,
}: {
  sessions: Session[];
  isLoading: boolean;
  actionLoading: string | null;
  onRefresh: () => void;
  onRevokeSession: (sessionToken: string) => void;
  onRevokeAll: () => void;
}) => {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Active Sessions</CardTitle>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {sessions.length > 0 && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              size="sm"
              onClick={onRevokeAll}
              disabled={actionLoading === 'revoke-all'}
            >
              {actionLoading === 'revoke-all' ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke All'
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {!isLoading && sessions.length === 0 && (
          <p className="text-muted-foreground py-4 text-center">No active sessions</p>
        )}
        {!isLoading && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-muted/50 flex items-center justify-between rounded-lg p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{session.userAgent || 'Unknown Device'}</p>
                  <div className="text-muted-foreground flex items-center gap-4 text-xs">
                    <span>IP: {session.ipAddress || 'Unknown'}</span>
                    <span>
                      Expires: {format.date(new Date(session.expiresAt), 'MMMM D, YYYY h:mm A')}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  size="sm"
                  onClick={() => onRevokeSession(session.token)}
                  disabled={actionLoading === `revoke-${session.token}`}
                >
                  {actionLoading === `revoke-${session.token}` ? (
                    <>
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    'Revoke'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
