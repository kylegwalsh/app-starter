import { analytics } from '@repo/analytics';

// Ensure analytics is initialized and prevent tree shaking
// This explicit reference ensures the PostHog client is created
// biome-ignore lint/complexity/noVoid: We need to ensure the analytics client is created
void analytics;
