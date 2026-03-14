import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Skeleton,
} from '@repo/design';
import { ArrowLeftIcon, CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { organizationApi, type Organization } from '../../lib/auth-client';

export function meta() {
  return [
    { title: 'Edit Organization - Better Auth Admin' },
    { name: 'description', content: 'Edit organization details' },
  ];
}

export default function EditOrganizationPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSlug, setOriginalSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo: '',
  });

  const fetchOrganization = useCallback(async () => {
    if (!orgId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: apiError } = await organizationApi.getFullOrganization({
        query: { organizationId: orgId },
      });

      if (apiError || !data) {
        throw new Error(apiError?.message || 'Failed to fetch organization');
      }

      const org = data as Organization;
      setForm({
        name: org.name,
        slug: org.slug,
        logo: org.logo || '',
      });
      setOriginalSlug(org.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  // Generate slug from name
  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  // Check slug availability with debounce
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

  // Debounced slug check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.slug && form.slug !== originalSlug) {
        checkSlugAvailability(form.slug);
      } else if (form.slug === originalSlug) {
        setSlugAvailable(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.slug, originalSlug, checkSlugAvailability]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgId) return;

    // Validation
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
        organizationId: orgId,
        data: {
          name: form.name,
          slug: form.slug,
          logo: form.logo || undefined,
        },
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update organization');
      }

      navigate(`/dashboard/organizations/${orgId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/dashboard/organizations/${orgId}`}>
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/organizations">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Organization</h1>
        </div>
        <Alert variant="destructive" className="max-w-2xl">
          <AlertDescription>
            {error}
            <button onClick={fetchOrganization} className="mt-2 block text-sm underline">
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/dashboard/organizations/${orgId}`}>
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Organization</h1>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Acme Corporation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })}
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
              <p className="text-muted-foreground text-sm">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
              {slugAvailable === false && (
                <p className="text-destructive text-sm">This slug is already taken</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                type="url"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-muted-foreground text-sm">
                Optional. Provide a URL to the organization's logo.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting || slugAvailable === false}>
                {isSubmitting && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/dashboard/organizations/${orgId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
