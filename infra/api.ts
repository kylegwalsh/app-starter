import { gateway } from './gateway';

// Import our apps so that we can access their URLs in our functions
const { web } = await import('./web');
const { admin } = await import('./admin');

/** Single function handles all backend routes — Hono routes internally */
const apiHandler = new sst.aws.Function('apiHandler', {
  handler: 'apps/backend/lambda/api.handler',
  streaming: true,
  link: [gateway, web, admin],
});

// One catch-all route — Hono handles all path routing internally
gateway.route('$default', apiHandler.arn);
