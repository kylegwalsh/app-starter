import { api } from './api';
import { domain } from './utils';

// Admin dashboard — static SPA deployed at admin.{domain}
export const admin = new sst.aws.StaticSite('admin', {
  domain: domain ? `admin.${domain}` : undefined,
  path: 'apps/admin',
  build: {
    command: 'bun run build',
    output: 'build/client',
  },
  environment: {
    VITE_API_URL: api.url,
    VITE_STAGE: $app.stage,
  },
});
