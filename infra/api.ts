import { domain } from './utils';

// Our main backend API
export const api = new sst.aws.ApiGatewayV2('api', {
  domain: domain ? `api.${domain}` : undefined,
  cors: {
    allowOrigins: ['http://*', 'https://*'],
    allowHeaders: ['content-type', 'authorization', 'x-posthog-session-id'],
    allowCredentials: true,
  },
});

// Import the web app so that we can access it's URL in our functions
const { site } = await import('./web');

/** We use a special function for our auth routes (handled by Better Auth) */
const authHandler = new sst.aws.Function('authHandler', {
  handler: 'apps/backend/functions/auth.handler',
  link: [api, site],
});

/** We use one function for all of our standard routes (handled by oRPC) */
const apiHandler = new sst.aws.Function('apiHandler', {
  handler: 'apps/backend/functions/api.handler',
  link: [api, site],
});

// Auth routes
api.route('GET /api/auth/{path+}', authHandler.arn);
api.route('POST /api/auth/{path+}', authHandler.arn);

// oRPC routes (REST-native, includes docs + spec)
api.route('GET /{path+}', apiHandler.arn);
api.route('POST /{path+}', apiHandler.arn);
api.route('PUT /{path+}', apiHandler.arn);
api.route('DELETE /{path+}', apiHandler.arn);
api.route('PATCH /{path+}', apiHandler.arn);
