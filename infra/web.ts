import { apiUrl } from './gateway';
import { domain } from './utils';

/** Main web app */
export const web = new sst.aws.Nextjs('web', {
  domain: domain ? `app.${domain}` : undefined,
  path: 'apps/web',
  buildCommand: 'bun run build:open-next',
  environment: {
    NEXT_PUBLIC_STAGE: $app.stage,
    NEXT_PUBLIC_API_URL: apiUrl.properties.url,
  },
});
