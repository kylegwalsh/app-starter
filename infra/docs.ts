import { NextjsSite, type StackContext } from 'sst/constructs';

import { getDomainForStage } from './utils';

/** Deploys our documentation site */
export const DocsStack = ({ stack }: StackContext) => {
  const rootDomain = getDomainForStage(stack.stage);

  // Our documentation site
  const site = new NextjsSite(stack, 'docs', {
    customDomain: rootDomain
      ? {
          domainName: `docs.${rootDomain}`,
          hostedZone: rootDomain,
        }
      : undefined,
    path: 'apps/docs',
  });

  stack.addOutputs({
    docsUrl: site.customDomainUrl ?? site.url,
  });

  return { site };
};
