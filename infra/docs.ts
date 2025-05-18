// Our documentation site
export const site = new sst.aws.Nextjs('docs', {
  domain: $app.stage === 'prod' ? 'docs.DOMAIN_HERE' : `${$app.stage}.docs.DOMAIN_HERE`,
  path: 'apps/docs',
});
