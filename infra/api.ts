import { gateway } from './gateway';

// Import our apps so that we can access their URLs in our functions
const { web } = await import('./web');
const { admin } = await import('./admin');
const { uploadsBucket, uploadsCdn } = await import('./storage');

/** Single function handles all backend routes — Hono routes internally */
const serverHandler = new sst.aws.Function('serverHandler', {
  handler: 'apps/backend/lambda/api.handler',
  streaming: true,
  link: [gateway, web, admin, uploadsBucket, uploadsCdn],
});

// One catch-all route — Hono handles all path routing internally
gateway.route('$default', serverHandler.arn);
