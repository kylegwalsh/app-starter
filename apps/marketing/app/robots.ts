import { config } from '@repo/config';
import type { MetadataRoute } from 'next';

// Generate at build time (required for static export)
export const dynamic = 'force-static';

/** The robots.txt rules */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = config.marketing.url;
  // Only the production site with a custom domain is indexed
  if (config.stage !== 'prod' || !siteUrl) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  };
}
