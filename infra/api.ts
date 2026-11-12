import { API_MAX_TIMEOUT_MS } from '@repo/constants';

import { apiUrl, gateway } from './gateway';

const { web } = await import('./web');
const { admin } = await import('./admin');
const { uploadsBucket } = await import('./storage');
// const { marketing } = await import('./marketing');

/** Single function handles all backend routes — Hono routes internally. */
const apiHandler = new sst.aws.Function('apiHandler', {
  handler: 'apps/backend/lambda/api.handler',
  streaming: true,
  timeout: `${API_MAX_TIMEOUT_MS / 1000} seconds`,
  link: [
    web,
    admin,
    apiUrl,
    uploadsBucket,
    // marketing
  ],
});

// One catch-all route — Hono handles all path routing internally.
gateway.route('ANY /{proxy+}', apiHandler.arn, {
  streaming: true,
  transform: {
    // Requires the AWS quota "Maximum integration timeout in milliseconds" raised above its 29s default:
    // https://us-east-1.console.aws.amazon.com/servicequotas/home/services/apigateway/quotas
    integration: { timeoutMilliseconds: API_MAX_TIMEOUT_MS },
  },
});
gateway.deploy();
