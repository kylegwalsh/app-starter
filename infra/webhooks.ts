const { api } = await import('./api');
const { site } = await import('./web');

/** Dedicated function for webhook handlers (Chat SDK, etc.) */
export const webhookHandler = new sst.aws.Function('webhookHandler', {
  handler: 'apps/backend/functions/chat.handler',
  link: [api, site],
});

// Webhook routes (registered before oRPC catch-all for route priority)
api.route('GET /webhooks/{platform}', webhookHandler.arn);
api.route('POST /webhooks/{platform}', webhookHandler.arn);
