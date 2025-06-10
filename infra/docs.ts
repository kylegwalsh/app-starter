/** The domain where we will host the docs site */
const domain = undefined;

// Our documentation site
export const site = new sst.aws.Nextjs('docs', {
  domain,
  path: 'apps/docs',
});
