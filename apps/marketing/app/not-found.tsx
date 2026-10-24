import { createMetadata } from '@repo/seo';
import Link from 'next/link';

/** The metadata for the not found page */
export const metadata = createMetadata({ title: 'Page not found' });

/** The not found page (exported as 404.html, which the CDN serves for unknown paths) */
export default function NotFoundPage() {
  return (
    <section className="relative flex min-h-[70svh] items-center justify-center overflow-hidden px-4 py-24 sm:px-6">
      {/* Soft brand wash behind the page, matching the hero */}
      <div
        aria-hidden
        className="from-brand/5 pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-gradient-to-b to-transparent"
      />

      <div className="flex max-w-xl flex-col items-center text-center">
        {/* The status code as a large, faded brand numeral */}
        <p
          aria-hidden
          className="font-display from-brand to-brand/30 bg-gradient-to-b bg-clip-text text-8xl font-semibold tracking-tighter text-transparent sm:text-9xl"
        >
          404
        </p>

        <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Page not found</h1>
        <p className="text-muted-foreground mt-4 text-lg text-pretty">
          The page you're looking for doesn't exist or has moved.
        </p>

        <Link href="/" className="text-brand mt-8 font-medium underline-offset-4 hover:underline">
          Back to home →
        </Link>
      </div>
    </section>
  );
}
