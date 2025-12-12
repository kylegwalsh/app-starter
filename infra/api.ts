import { Api, Function, type StackContext } from 'sst/constructs';
import { getDomainForStage } from './utils';

/** Deploys our main backend API */
export const ApiStack = ({ stack }: StackContext) => {
  const rootDomain = getDomainForStage(stack.stage);

  // Our main backend API
  const api = new Api(stack, 'api', {
    customDomain: rootDomain
      ? {
          domainName: `api.${rootDomain}`,
        }
      : undefined,
    // TODO: See if we need this
    // cors: {
    //   allowOrigins: ['http://*', 'https://*'],
    //   allowHeaders: ['content-type', 'authorization'],
    //   allowCredentials: true,
    // },
  });

  /** We use a special function for our auth routes (handled by Better Auth) */
  const authHandler = new Function(stack, 'authHandler', {
    handler: 'apps/backend/functions/auth.handler',
    bind: [api],
  });

  /** We use one function for all of our standard routes (handled by tRPC + openapi) */
  const apiHandler = new Function(stack, 'apiHandler', {
    handler: 'apps/backend/functions/api.handler',
    bind: [api],
  });

  api.addRoutes(stack, {
    // Auth routes
    'GET /api/auth/{path+}': {
      type: 'function',
      cdk: { function: authHandler },
    },
    'POST /api/auth/{path+}': {
      type: 'function',
      cdk: { function: authHandler },
    },

    // tRPC routes
    'GET /trpc/{path+}': { type: 'function', cdk: { function: apiHandler } },
    'POST /trpc/{path+}': { type: 'function', cdk: { function: apiHandler } },

    // REST routes
    'GET /api/{path+}': { type: 'function', cdk: { function: apiHandler } },
    'POST /api/{path+}': { type: 'function', cdk: { function: apiHandler } },
    'PUT /api/{path+}': { type: 'function', cdk: { function: apiHandler } },
    'DELETE /api/{path+}': { type: 'function', cdk: { function: apiHandler } },
    'PATCH /api/{path+}': { type: 'function', cdk: { function: apiHandler } },

    // Swagger docs (for REST routes)
    'GET /docs': { type: 'function', cdk: { function: apiHandler } },
  });

  stack.addOutputs({
    apiUrl: api.customDomainUrl ?? api.url,
  });

  return { api };
};
