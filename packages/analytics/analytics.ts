import { config } from '@repo/config';
import { log } from '@repo/logs';
import { PostHog } from 'posthog-node';

import { createAnalyticsEvents } from './events';

/** Create the post hog client */
let posthog: PostHog | undefined;

try {
  // We only enable posthog if we have an api key
  posthog =
    config.posthog.isEnabled && config.posthog.apiKey
      ? new PostHog(config.posthog.apiKey, {
          // We run in a serverless environment, so we need to flush immediately
          flushAt: 1,
          flushInterval: 0,
        })
      : undefined;
} catch (error) {
  console.error('[analytics] Error initializing posthog', error);
}

/** Generate the analytics object */
export const analytics = createAnalyticsEvents<'backend'>({
  platformAnalytics: posthog as PostHog,
  platform: 'backend',
  log,
});
