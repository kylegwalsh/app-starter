'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
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
} from '@repo/design';
import { Loader2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { adminApi, type User } from '@/core/auth';

// Persist profile edits via the admin API, then refetch and return the updated user
const saveUser = async (
  userId: string,
  form: { name: string; email: string; role: 'user' | 'admin'; emailVerified: boolean },
  originalRole: string | null,
) => {
  const { error: updateError } = await adminApi.updateUser({
    userId,
    data: {
      name: form.name,
      email: form.email,
      emailVerified: form.emailVerified,
    },
  });

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update user');
  }

  // Issue a separate setRole call if the role changed
  if (form.role !== originalRole) {
    const { error: roleError } = await adminApi.setRole({
      userId,
      role: form.role,
    });

    if (roleError) {
      throw new Error(roleError.message || 'Failed to update role');
    }
  }

  // Refetch to get the updated user
  const { data: refreshData } = await adminApi.listUsers({
    query: { filterField: 'id', filterValue: userId, filterOperator: 'eq', limit: 1 },
  });

  if (refreshData && refreshData.users.length > 0) {
    return refreshData.users[0] as User;
  }

  return null;
};

export const EditUserDialog = ({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updatedUser: User) => void;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email,
    role: (user.role as 'user' | 'admin') || 'user',
    emailVerified: user.emailVerified,
  });

  // Reset form when the dialog opens with fresh user data
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm({
        name: user.name || '',
        email: user.email,
        role: (user.role as 'user' | 'admin') || 'user',
        emailVerified: user.emailVerified,
      });
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSaving(true);
      const updatedUser = await saveUser(user.id, form, user.role);
      if (updatedUser) {
        onSaved(updatedUser);
      }
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as 'user' | 'admin' })}
              >
                <SelectTrigger id="edit-role">
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
                id="edit-emailVerified"
                checked={form.emailVerified}
                onCheckedChange={(checked) => setForm({ ...form, emailVerified: checked === true })}
              />
              <Label htmlFor="edit-emailVerified">Email Verified</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
