import { config } from '@repo/config';
import { PostHog } from 'posthog-node';

import { createAnalyticsEvents } from './events';

/** Create the post hog client */
const posthog = new PostHog(config.posthog.apiKey, {
  // We run in a serverless environment, so we need to flush immediately
  flushAt: 1,
  flushInterval: 0,
});

/** Generate the analytics object */
export const analytics = createAnalyticsEvents<'backend'>({
  platformAnalytics: posthog,
  platform: 'backend',
});
