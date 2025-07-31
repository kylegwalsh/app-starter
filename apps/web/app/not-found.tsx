import { Button } from '@repo/design';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center px-4 py-12">
      <div className="text-center">
        {/* 404 Header */}
        <h1 className="text-muted-foreground mb-4 text-6xl font-bold">404</h1>

        {/* Error Message */}
        <h2 className="mb-2 text-2xl font-semibold">Page not found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or
          doesn't exist.
        </p>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/settings">Go to Settings</Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="text-muted-foreground mt-12 text-sm">
          <p>If you believe this is an error, please contact support.</p>
        </div>
      </div>
    </div>
  );
}
