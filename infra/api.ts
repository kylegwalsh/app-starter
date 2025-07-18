// Our main backend API
export const api = new sst.aws.ApiGatewayV2('api', {
  cors: {
    allowOrigins: ['http://*', 'https://*'],
    allowHeaders: ['content-type', 'authorization'],
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

/** We use one function for all of our standard routes (handled by tRPC + openapi) */
const apiHandler = new sst.aws.Function('apiHandler', {
  handler: 'apps/backend/functions/api.handler',
  link: [api, site],
});

// Auth routes
api.route('GET /api/auth/{path+}', authHandler.arn);
api.route('POST /api/auth/{path+}', authHandler.arn);

// tRPC routes
api.route('GET /trpc/{path+}', apiHandler.arn);
api.route('POST /trpc/{path+}', apiHandler.arn);

// REST routes
api.route('GET /api/{path+}', apiHandler.arn);
api.route('POST /api/{path+}', apiHandler.arn);
api.route('PUT /api/{path+}', apiHandler.arn);
api.route('DELETE /api/{path+}', apiHandler.arn);
api.route('PATCH /api/{path+}', apiHandler.arn);

// Swagger docs (for REST routes)
api.route('GET /docs', apiHandler.arn);
