import { config } from '@repo/config';
import type { MetadataRoute } from 'next';

// Generate at build time (required for static export)
export const dynamic = 'force-static';

/** The pages to include in the sitemap (add new pages here) */
const PAGES = ['/'];

/** The sitemap for search engines */
export default function sitemap(): MetadataRoute.Sitemap {
  // Without a domain the site isn't indexed (see robots.ts), so there's nothing to list
  const siteUrl = config.marketing.url;
  if (!siteUrl) {
    return [];
  }

  return PAGES.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(),
  }));
}
