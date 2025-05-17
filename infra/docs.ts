export const site = new sst.aws.Nextjs('site', {
  // domain: $app.stage === 'prod' ? 'docs.DOMAIN_HERE' : `${$app.stage}.docs.DOMAIN_HERE`,
  path: 'apps/docs',
});
