/// <reference lib="dom" />

import { config } from '@repo/config';
import { posthog } from 'posthog-js';

import { createAnalyticsEvents } from './events';

// Only initialize PostHog if we're on the client and PostHog is enabled
if (
  typeof window !== 'undefined' &&
  config.posthog.analytics.isEnabled &&
  config.posthog.analytics.apiKey
) {
  // Initialize our PostHog instance
  posthog.init(config.posthog.analytics.apiKey, {
    // We send all events to the web app's /event-relay endpoint, which re-writes them to PostHog (see
    // apps/web/next.config.ts). This helps to avoid issues with ad blockers.
    api_host: `${config.app.url}/event-relay`,
    capture_pageview: 'history_change',
    capture_exceptions: true,
    autocapture: true,
    capture_performance: true,
    // Compression seems to cause issues with Cloudfront, so we'll disable it for now
    disable_compression: true,
  });
}

/** Our analytics client (for sending events to PostHog) */
export const analytics = createAnalyticsEvents<'web'>({
  platformAnalytics: posthog,
  platform: 'web',
});
