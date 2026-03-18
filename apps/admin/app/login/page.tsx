'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
  Label,
} from '@repo/design';
import { Loader2Icon, ShieldIcon, XIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '@/contexts/auth-context';

/**
 * Admin login page — authenticates via Better Auth email/password and verifies admin role.
 * Redirects to `?redirect=` param (or `/dashboard`) on success. Already-authenticated admins
 * are redirected immediately.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const LoginForm = () => {
  const { isAuthenticated, isAdmin, isLoading, error, login, clearError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated && isAdmin && !isLoading) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isAdmin, isLoading, router, redirectTo]);

  // Submit email/password to Better Auth, redirect on success or surface error
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const success = await login(email, password);
    if (success) {
      router.replace(redirectTo);
    }

    setIsSubmitting(false);
  };

  if (isAuthenticated && isAdmin && !isLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={clearError}>
                    <XIcon className="h-4 w-4" />
                  </button>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
