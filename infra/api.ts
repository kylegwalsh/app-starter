export const api = new sst.aws.ApiGatewayV2("api");

const trpcFunction = new sst.aws.Function("trpc", {
  handler: "apps/backend/functions/api/trpc.handler",
});

// Add routes
api.route("GET /trpc/{path+}", trpcFunction.arn);
api.route("POST /trpc/{path+}", trpcFunction.arn);
