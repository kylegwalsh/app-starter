import { gateway } from './gateway';
import { domain } from './utils';
import { web } from './web';

// Our marketing site
export const marketing = new sst.aws.StaticSite('marketing', {
  domain: domain
    ? {
        name: domain,
        // Only prod gets a www redirect
        redirects: $app.stage === 'prod' ? [`www.${domain}`] : undefined,
      }
    : undefined,
  path: 'apps/marketing',
  build: {
    command: 'bun run build',
    output: 'out',
  },
  errorPage: '404.html',
  dev: {
    command: 'bun run dev',
    url: 'http://localhost:3003',
  },
  environment: {
    NEXT_PUBLIC_STAGE: $app.stage,
    NEXT_PUBLIC_API_URL: gateway.url,
    // In `sst dev` the web app isn't deployed, so its url is a placeholder
    NEXT_PUBLIC_WEB_URL: $dev ? 'http://localhost:3000' : web.url,
    // The site can't reference its own url, so derive it from the domain (used for SEO metadata).
    // Without a domain there's nothing worth indexing, so we don't expose SEO there.
    NEXT_PUBLIC_MARKETING_URL: domain ? `https://${domain}` : '',
  },
});
