import { domain } from './utils';

/** Documentation site */
export const site = new sst.aws.Nextjs('docs', {
  domain: domain ? `docs.${domain}` : undefined,
  path: 'apps/docs',
  buildCommand: 'bun run build:open-next',
});
