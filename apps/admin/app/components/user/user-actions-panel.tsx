import {
  Alert,
  AlertDescription,
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
  Textarea,
} from '@repo/design';
import {
  BanIcon,
  CheckCircleIcon,
  InfoIcon,
  KeyIcon,
  Loader2Icon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { adminApi, type User } from '../../lib/auth-client';

export function UserActionsPanel({
  user,
  onError,
}: {
  user: User;
  onError: (error: string) => void;
}) {
  const navigate = useNavigate();

  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleBan = async () => {
    if (user.role === 'admin') {
      onError('Cannot ban an admin user');
      setShowBanModal(false);
      return;
    }

    try {
      setActionLoading('ban');
      const { error: banError } = await adminApi.banUser({
        userId: user.id,
        banReason: banReason || undefined,
      });

      if (banError) {
        throw new Error(banError.message || 'Failed to ban user');
      }

      setShowBanModal(false);
      setBanReason('');
      onError('');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async () => {
    try {
      setActionLoading('unban');
      const { error: unbanError } = await adminApi.unbanUser({
        userId: user.id,
      });

      if (unbanError) {
        throw new Error(unbanError.message || 'Failed to unban user');
      }

      onError('');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to unban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (user.role === 'admin') {
      onError('Cannot delete an admin user');
      return;
    }

    try {
      setActionLoading('delete');
      const { error: deleteError } = await adminApi.removeUser({
        userId: user.id,
      });

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete user');
      }

      navigate('/dashboard/users');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to delete user');
      setActionLoading(null);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword) {
      setPasswordError('Password is required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setActionLoading('password');
      setPasswordError(null);

      const { error: pwError } = await adminApi.setUserPassword({
        userId: user.id,
        newPassword,
      });

      if (pwError) {
        throw new Error(pwError.message || 'Failed to set password');
      }

      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to set password');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async () => {
    if (user.role === 'admin') {
      onError('Cannot impersonate admin users');
      return;
    }

    try {
      setActionLoading('impersonate');
      const { data, error: impersonateError } = await adminApi.impersonateUser({
        userId: user.id,
      });

      if (impersonateError) {
        throw new Error(impersonateError.message || 'Failed to impersonate user');
      }

      if (data) {
        window.location.href = '/';
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to impersonate user');
    } finally {
      setActionLoading(null);
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <>
      <Card className="sticky top-6 h-fit">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-xs tracking-wider uppercase">
            Security Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Ban / Unban */}
          {user.banned ? (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleUnban}
              disabled={actionLoading === 'unban'}
            >
              {actionLoading === 'unban' ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              Unban User
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setShowBanModal(true)}
              disabled={isAdmin}
              title={isAdmin ? 'Cannot ban admin users' : undefined}
            >
              <BanIcon className="h-4 w-4" />
              Ban User
            </Button>
          )}

          {/* Set Password */}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowPasswordModal(true)}
          >
            {actionLoading === 'password' ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <KeyIcon className="h-4 w-4" />
            )}
            Update Password
          </Button>

          {/* Delete */}
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isAdmin}
            title={isAdmin ? 'Cannot delete admin users' : undefined}
          >
            {actionLoading === 'delete' ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2Icon className="h-4 w-4" />
            )}
            Delete User
          </Button>

          {/* Impersonate */}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleImpersonate}
            disabled={isAdmin || actionLoading === 'impersonate'}
            title={isAdmin ? 'Cannot impersonate admin users' : undefined}
          >
            {actionLoading === 'impersonate' ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
            Impersonate User
          </Button>

          {/* Admin notice */}
          {isAdmin && (
            <Alert className="mt-3">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm font-medium">Administrative Privileges</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  You are viewing an admin profile. All actions are logged and traceable.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={showBanModal} onOpenChange={setShowBanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban this user? They will not be able to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Ban Reason (optional)</Label>
            <Textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for ban..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBanModal(false);
                setBanReason('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBan} disabled={actionLoading === 'ban'}>
              {actionLoading === 'ban' ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Banning...
                </>
              ) : (
                'Ban User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              {isAdmin
                ? 'Cannot delete an admin user. Remove admin role first.'
                : 'Are you sure you want to delete this user? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            {!isAdmin && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
              >
                {actionLoading === 'delete' ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog
        open={showPasswordModal}
        onOpenChange={(open) => {
          setShowPasswordModal(open);
          if (!open) {
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set User Password</DialogTitle>
            <DialogDescription>
              Set a new password for this user. They will need to use this password to log in.
            </DialogDescription>
          </DialogHeader>
          {passwordError && (
            <Alert variant="destructive">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false);
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={actionLoading === 'password'}>
              {actionLoading === 'password' ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Setting...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
