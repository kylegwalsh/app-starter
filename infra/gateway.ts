import { CORS_ALLOW_HEADERS } from '../packages/constants/cors';

import { domain } from './utils';

/** The core API Gateway resource (shared amongst other resources) */
export const gateway = new sst.aws.ApiGatewayV2('api', {
  domain: domain ? `api.${domain}` : undefined,
  cors: {
    allowOrigins: ['http://*', 'https://*'],
    allowHeaders: [...CORS_ALLOW_HEADERS],
    allowCredentials: true,
  },
});
