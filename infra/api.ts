export const api = new sst.aws.ApiGatewayV2('api');

/** We use one function for all of our routes (handled by tRPC + openapi) */
const apiHandler = new sst.aws.Function('apiHandler', {
  handler: 'apps/backend/functions/api.handler',
  link: [api],
});

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
