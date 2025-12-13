import { domain } from './utils';

// Our documentation site
export const site = new sst.aws.Nextjs('docs', {
  domain: domain ? `docs.${domain}` : undefined,
  path: 'apps/docs',
});
