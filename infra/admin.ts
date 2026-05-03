import { gateway } from './gateway';
import { domain } from './utils';
import { web } from './web';

/** Admin dashboard for managing users and organizations */
export const admin = new sst.aws.Nextjs('admin', {
  domain: domain ? `admin.${domain}` : undefined,
  link: [gateway],
  path: 'apps/admin',
  buildCommand: 'bun run build:open-next',
  environment: {
    NEXT_PUBLIC_STAGE: $app.stage,
    NEXT_PUBLIC_API_URL: gateway.url,
    NEXT_PUBLIC_WEB_URL: web.url,
  },
});
