import { apiUrl } from './gateway';
// oxlint-disable-next-line no-namespace -- Read as a whole to check which optional secrets are declared
import * as secrets from './secrets';
import { domain } from './utils';

/** Main web app */
export const web = new sst.aws.Nextjs('web', {
  domain: domain ? `app.${domain}` : undefined,
  path: 'apps/web',
  buildCommand: 'bun run build:open-next',
  environment: {
    NEXT_PUBLIC_STAGE: $app.stage,
    NEXT_PUBLIC_API_URL: apiUrl.properties.url,
    NEXT_PUBLIC_CODE_SANDBOX_ENABLED: String('DAYTONA_API_KEY' in secrets),
  },
});
