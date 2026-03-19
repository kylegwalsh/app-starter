import { domain } from './utils';

// The core API Gateway resource (shared amongst other resources)
export const gateway = new sst.aws.ApiGatewayV2('api', {
  domain: domain ? `api.${domain}` : undefined,
  cors: {
    allowOrigins: ['http://*', 'https://*'],
    allowHeaders: [
      'content-type',
      'authorization',
      'x-posthog-session-id',
      'mcp-session-id',
      'mcp-protocol-version',
    ],
    allowCredentials: true,
  },
});
