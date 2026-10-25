import './globals.css';

import { config } from '@repo/config';
import { createMetadata } from '@repo/seo';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { Footer, Nav } from '@/components';

// Pick typefaces that fit the product, a distinctive display face does a lot of the work
const heading = Inter({ subsets: ['latin'], variable: '--font-heading' });
const text = Inter({ subsets: ['latin'], variable: '--font-text' });

const siteUrl = config.marketing.url;

/** The default metadata for the marketing site (pages can override with their own `createMetadata`) */
export const metadata = createMetadata({
  // The overall site description metadata for SEO purposes
  // description: '',
  // Social previews need absolute urls, which are only known with a custom domain
  ...(siteUrl && { image: '/og.png', metadataBase: new URL(siteUrl) }),
});

/** The root layout wrapping every marketing page */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${heading.variable} ${text.variable}`}>
      <body className="flex min-h-svh flex-col font-sans antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
