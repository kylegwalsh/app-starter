'use client';

import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/design';
import { format } from '@repo/utils';
import { ArrowLeftIcon, EyeIcon, Loader2Icon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { EditOrganizationDialog } from '@/components/organizations/edit-organization-dialog';
import { OrganizationDetailPluginDisabled } from '@/components/organizations/organization-detail-plugin-disabled';
import {
  organizationApi,
  type Invitation,
  type Member,
  type Organization,
  type User,
} from '@/core/auth';

type MemberWithUser = Member & {
  user?: User;
};

type FullOrganization = Organization & {
  members?: MemberWithUser[];
  invitations?: Invitation[];
};

const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'owner': {
      return 'default';
    }
    case 'admin': {
      return 'outline';
    }
    default: {
      return 'secondary';
    }
  }
};

const getStatusBadgeVariant = (
  status: string,
): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'accepted': {
      return 'default';
    }
    case 'rejected':
    case 'canceled': {
      return 'destructive';
    }
    case 'pending': {
      return 'outline';
    }
    default: {
      return 'secondary';
    }
  }
};

/**
 * Organization detail page — view org info, manage members (role changes, removal),
 * send/cancel invitations, and delete the organization.
 */
export default function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const [organization, setOrganization] = useState<FullOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as 'admin' | 'member',
  });
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Load full org data including members and invitations
  const fetchOrganization = useCallback(async () => {
    if (!orgId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: apiError } = await organizationApi.getFullOrganization({
        query: { organizationId: orgId },
      });

      if (apiError || !data) {
        throw new Error(apiError?.message || 'Failed to fetch organization');
      }

      setOrganization(data as FullOrganization);
    } catch (error) {
      console.error('Error fetching organization:', error);
      setError(error instanceof Error ? error.message : 'Failed to load organization');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  // Permanently delete the organization and redirect to the list
  const handleDelete = async () => {
    if (!orgId) {
      return;
    }

    try {
      setActionLoading('delete');
      const { error: deleteError } = await organizationApi.delete({
        organizationId: orgId,
      });

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete organization');
      }

      router.push('/dashboard/organizations');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete organization');
    } finally {
      setActionLoading(null);
      setShowDeleteConfirm(false);
    }
  };

  // Update a member's role in-place and refetch org to reflect the change
  const handleUpdateMemberRole = async (
    memberId: string,
    newRole: 'owner' | 'admin' | 'member',
  ) => {
    if (!orgId) {
      return;
    }

    try {
      setActionLoading(`role-${memberId}`);
      const { error: updateError } = await organizationApi.updateMemberRole({
        memberId,
        role: newRole,
        organizationId: orgId,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update member role');
      }

      await fetchOrganization();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update member role');
    } finally {
      setActionLoading(null);
    }
  };

  // Confirm then remove the member from the org and refetch
  const handleRemoveMember = async (memberIdOrEmail: string) => {
    if (!orgId) {
      return;
    }

    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      setActionLoading(`remove-${memberIdOrEmail}`);
      const { error: removeError } = await organizationApi.removeMember({
        memberIdOrEmail,
        organizationId: orgId,
      });

      if (removeError) {
        throw new Error(removeError.message || 'Failed to remove member');
      }

      await fetchOrganization();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  // Send an email invitation to the specified address with the chosen role
  const handleInviteMember = async () => {
    if (!orgId) {
      return;
    }

    setInviteError(null);

    if (!inviteForm.email) {
      setInviteError('Email is required');
      return;
    }

    try {
      setActionLoading('invite');
      const { error: inviteApiError } = await organizationApi.inviteMember({
        email: inviteForm.email,
        role: inviteForm.role,
        organizationId: orgId,
      });

      if (inviteApiError) {
        throw new Error(inviteApiError.message || 'Failed to send invitation');
      }

      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'member' });
      await fetchOrganization();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setActionLoading(null);
    }
  };

  // Confirm then cancel a pending invitation and refetch to update the list
  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    try {
      setActionLoading(`cancel-${invitationId}`);
      const { error: cancelError } = await organizationApi.cancelInvitation({
        invitationId,
      });

      if (cancelError) {
        throw new Error(cancelError.message || 'Failed to cancel invitation');
      }

      await fetchOrganization();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel invitation');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header: back + avatar + name/slug + edit/delete */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-9 rounded-md" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-14" />
            <Skeleton className="h-9 w-18" />
          </div>
        </div>

        {/* Organization details card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Members card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-3 w-10" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-3 w-10" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-3 w-14" />
                </TableHead>
                <TableHead className="text-right">
                  <Skeleton className="ml-auto h-3 w-14" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 2 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="size-8" />
                      <Skeleton className="size-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Invitations card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !organization) {
    return <OrganizationDetailPluginDisabled />;
  }

  if (!organization) {
    return null;
  }

  const pendingInvitations =
    organization.invitations?.filter((inv) => inv.status === 'pending') ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/organizations">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={organization.logo ?? undefined} alt={organization.name} />
              <AvatarFallback className="rounded-lg">
                {organization.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{organization.name}</h1>
              <p className="text-muted-foreground font-mono text-sm">{organization.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-auto p-0 text-sm underline"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-sm font-medium">Name</dt>
              <dd>{organization.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm font-medium">Slug</dt>
              <dd className="font-mono">{organization.slug}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm font-medium">Created</dt>
              <dd>{format.date(new Date(organization.createdAt))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm font-medium">Members</dt>
              <dd>{organization.members?.length ?? 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Members Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Members</CardTitle>
          <Button size="sm" onClick={() => setShowInviteModal(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          {organization.members && organization.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(member.user?.name || member.user?.email || 'U')
                              .slice(0, 1)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user?.name || 'Unknown'}</p>
                          <p className="text-muted-foreground text-sm">
                            {member.user?.email || member.userId}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleUpdateMemberRole(member.id, value as 'owner' | 'admin' | 'member')
                        }
                        disabled={actionLoading === `role-${member.id}`}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format.date(new Date(member.createdAt))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/users/${member.userId}`}>
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={
                            actionLoading === `remove-${member.id}` || member.role === 'owner'
                          }
                          className="text-destructive hover:text-destructive"
                        >
                          {actionLoading === `remove-${member.id}` ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              No members in this organization
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invitations Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(invitation.status)}>
                        {invitation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format.date(new Date(invitation.expiresAt))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={actionLoading === `cancel-${invitation.id}`}
                        className="text-destructive hover:text-destructive"
                      >
                        {actionLoading === `cancel-${invitation.id}` ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-8 text-center">No pending invitations</p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{organization.name}&quot;? This will remove all
              members and invitations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <EditOrganizationDialog
        organization={organization}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSaved={fetchOrganization}
      />

      {/* Invite Member Dialog */}
      <Dialog
        open={showInviteModal}
        onOpenChange={(open) => {
          setShowInviteModal(open);
          if (!open) {
            setInviteError(null);
            setInviteForm({ email: '', role: 'member' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an invitation to join this organization.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {inviteError && (
              <Alert variant="destructive">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) =>
                  setInviteForm({ ...inviteForm, role: value as 'admin' | 'member' })
                }
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteModal(false);
                setInviteError(null);
                setInviteForm({ email: '', role: 'member' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={actionLoading === 'invite'}>
              {actionLoading === 'invite' ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
