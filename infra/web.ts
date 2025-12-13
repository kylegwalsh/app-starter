import { NextjsSite, type StackContext, use } from 'sst/constructs';

import { ApiStack } from './api';
import { getDomainForStage } from './utils';

export const WebStack = ({ stack }: StackContext) => {
  const { api } = use(ApiStack);
  const rootDomain = getDomainForStage(stack.stage);

  // Our main web app
  const site = new NextjsSite(stack, 'web', {
    customDomain: rootDomain
      ? {
          domainName: `app.${rootDomain}`,
        }
      : undefined,
    bind: [api],
    path: 'apps/web',
    buildCommand: 'bunx open-next build',
    environment: {
      NEXT_PUBLIC_STAGE: stack.stage,
      NEXT_PUBLIC_API_URL: api.url,
    },
  });

  stack.addOutputs({
    appUrl: site.customDomainUrl ?? site.url,
  });

  return { site };
};
