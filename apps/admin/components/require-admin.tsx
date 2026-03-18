'use client';

import { Button, Card, CardContent, CardHeader } from '@repo/design';
import { Loader2Icon, ShieldAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/contexts/auth-context';

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect unauthenticated visitors to login, preserving the intended path as a query param
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="bg-destructive/10 mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full">
              <ShieldAlertIcon className="text-destructive h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Access Denied</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You don't have permission to access this page. Admin privileges are required.
            </p>
            <Button asChild>
              <Link href="/login">Return to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
