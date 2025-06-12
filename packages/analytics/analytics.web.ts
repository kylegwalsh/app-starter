import { config } from '@repo/config';
import posthog from 'posthog-js';

import { createAnalyticsEvents } from './events';

// Type declaration for Crisp chat
declare global {
  const $crisp: {
    push(command: unknown): void;
  };
}

// Initialize our PostHog instance
posthog.init(config.posthog.apiKey, {
  capture_pageview: config.posthog.isEnabled ? 'history_change' : false,
  capture_exceptions: config.posthog.isEnabled,
  autocapture: config.posthog.isEnabled,
  capture_performance: true,
});

/** Our analytics client (for sending events to PostHog) */
export const analytics = createAnalyticsEvents<'web'>({
  platformAnalytics: posthog,
  platform: 'web',
  // We also identify the user in other platforms
  onIdentify: ({ userId, traits }) => {
    // Identify the user in Crisp chat
    if (typeof $crisp !== 'undefined') {
      $crisp.push(['set', 'session:data', ['user-id', userId]]);
      if (traits?.email) $crisp.push(['set', 'user:email', [traits.email]]);
    }
  },
  // We need to sign the user out of other platforms
  onSignOut: () => {
    // Sign the user out of Crisp chat
    if (typeof $crisp !== 'undefined') {
      $crisp.push(['do', 'session:reset']);
    }
  },
});
