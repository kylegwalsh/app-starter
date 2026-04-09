'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@repo/design';
import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { organizationApi, type Organization } from '@/core/auth';

// Sanitize manual slug input (allows hyphens, strips invalid characters)
const sanitizeSlug = (input: string) => input.toLowerCase().replaceAll(/[^a-z0-9-]/g, '');

export const EditOrganizationDialog = ({
  organization,
  open,
  onOpenChange,
  onSaved,
}: {
  organization: Organization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(true);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [form, setForm] = useState({
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo || '',
  });

  const originalSlug = organization.slug;

  // Reset form when the dialog opens with fresh org data
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm({
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo || '',
      });
      setSlugAvailable(true);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  // Check slug availability; skips the API call if the slug is unchanged from the original
  const checkSlugAvailability = useCallback(
    async (slug: string) => {
      if (!slug || slug.length < 2 || slug === originalSlug) {
        setSlugAvailable(slug === originalSlug ? true : null);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const { data } = await organizationApi.checkSlug({ slug });
        setSlugAvailable(data?.status === true);
      } catch {
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    },
    [originalSlug],
  );

  // Debounce slug availability check by 500ms; marks slug valid immediately if unchanged
  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      if (form.slug && form.slug !== originalSlug) {
        checkSlugAvailability(form.slug);
      } else if (form.slug === originalSlug) {
        setSlugAvailable(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.slug, originalSlug, checkSlugAvailability, open]);

  // Validate fields then persist the org update
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.slug) {
      setError('Name and slug are required');
      return;
    }

    if (form.slug.length < 2) {
      setError('Slug must be at least 2 characters');
      return;
    }

    if (slugAvailable === false) {
      setError('This slug is already taken');
      return;
    }

    try {
      setIsSubmitting(true);
      const { error: updateError } = await organizationApi.update({
        organizationId: organization.id,
        data: {
          name: form.name,
          slug: form.slug,
          logo: form.logo,
        },
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update organization');
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-org-name">
              Organization Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-org-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Acme Corporation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-org-slug">
              Slug <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="edit-org-slug"
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: sanitizeSlug(e.target.value) })}
                required
                className="pr-10 font-mono"
                placeholder="acme-corporation"
              />
              {isCheckingSlug && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
                </div>
              )}
              {!isCheckingSlug && slugAvailable === true && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <CheckIcon className="size-4 text-green-500" />
                </div>
              )}
              {!isCheckingSlug && slugAvailable === false && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <XIcon className="text-destructive size-4" />
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Used in URLs. Only lowercase letters, numbers, and hyphens.
            </p>
            {slugAvailable === false && (
              <p className="text-destructive text-xs">This slug is already taken</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-org-logo">Logo URL</Label>
            <Input
              id="edit-org-logo"
              type="url"
              value={form.logo}
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-muted-foreground text-xs">
              Optional. Provide a URL to the organization's logo.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || slugAvailable === false}
              loading={isSubmitting}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
