import { Button } from '@repo/design';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center px-4 py-12">
      <div className="text-center">
        {/* 404 Header */}
        <h1 className="mb-4 font-bold text-6xl text-muted-foreground">404</h1>

        {/* Error Message */}
        <h2 className="mb-2 font-semibold text-2xl">Page not found</h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          Sorry, we couldn't find the page you're looking for. It might have
          been moved, deleted, or doesn't exist.
        </p>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/settings">Go to Settings</Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-muted-foreground text-sm">
          <p>If you believe this is an error, please contact support.</p>
        </div>
      </div>
    </div>
  );
}
