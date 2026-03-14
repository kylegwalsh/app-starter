import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@repo/design';
import { ArrowLeftIcon, CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { organizationApi } from '../../lib/auth-client';

export function meta() {
  return [
    { title: 'Create Organization - Better Auth Admin' },
    { name: 'description', content: 'Create a new organization' },
  ];
}

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo: '',
  });

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Check slug availability with debounce
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
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
  }, []);

  // Debounced slug check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.slug) {
        checkSlugAvailability(form.slug);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.slug, checkSlugAvailability]);

  const handleNameChange = (name: string) => {
    const newSlug = generateSlug(name);
    setForm((prev) => ({
      ...prev,
      name,
      slug: newSlug,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const { data, error: createError } = await organizationApi.create({
        name: form.name,
        slug: form.slug,
        logo: form.logo || undefined,
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create organization');
      }

      if (data?.id) {
        navigate(`/dashboard/organizations/${data.id}`);
      } else {
        navigate('/dashboard/organizations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/organizations">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Create Organization</h1>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New Organization</CardTitle>
        </CardHeader>
        <CardContent>
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
                onChange={(e) => handleNameChange(e.target.value)}
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
                  className="pr-9 font-mono"
                  placeholder="acme-corporation"
                />
                {isCheckingSlug && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Loader2Icon className="text-muted-foreground h-4 w-4 animate-spin" />
                  </div>
                )}
                {!isCheckingSlug && slugAvailable === true && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {!isCheckingSlug && slugAvailable === false && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <XIcon className="text-destructive h-4 w-4" />
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
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                type="url"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-muted-foreground text-xs">
                Optional. Provide a URL to the organization's logo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <Button variant="outline" asChild>
                <Link to="/dashboard/organizations">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || slugAvailable === false}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
