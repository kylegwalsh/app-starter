import withBundleAnalyzer from '@next/bundle-analyzer';
import { withPostHogConfig } from '@posthog/nextjs-config';
import type { NextConfig } from 'next';

let nextConfig: NextConfig = {
  // Transpile the packages so we can use them in the web app
  transpilePackages: ['@repo/design', '@repo/config'],
  // We validate the types manually, so we'll just skip it here (the trpc routes complain anyways)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Generate source maps for error tracking
  productionBrowserSourceMaps: true,
  // Re-write posthog requests so that they don't get blocked
  rewrites: async () => [
    {
      source: '/event-relay/static/:path*',
      destination: 'https://us-assets.i.posthog.com/static/:path*',
    },
    {
      source: '/event-relay/:path*',
      destination: 'https://us.i.posthog.com/:path*',
    },
    {
      source: '/event-relay/flags',
      destination: 'https://us.i.posthog.com/flags',
    },
  ],
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  // Override the webpack config for custom functionality
  webpack: (config) => {
    // Ensure the web always grabs the .web files over the normal files (so it can share directories with the backend)
    // oxlint-disable no-unsafe-assignment, no-unsafe-member-access: The config is not fully typed
    config.resolve.extensions = config.resolve.extensions.flatMap((ext: string) => [
      `.web${ext}`,
      ext,
    ]);

    return config;
  },
};

// If we're running the bundle analyzer, add it to the config
if (process.env.ANALYZE === 'true') {
  nextConfig = withBundleAnalyzer()({
    ...nextConfig,
    typescript: {
      ignoreBuildErrors: true,
    },
  } satisfies NextConfig);
}

// Configure PostHog for source maps / error tracking
export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_CLI_TOKEN ?? '',
  envId: process.env.POSTHOG_CLI_ENV_ID ?? '',
  // Enable our source maps if we're running in the CI with our environment variables (unless we're skipping them)
  sourcemaps: {
    enabled:
      !process.env.SKIP_SOURCEMAPS &&
      !!(process.env.POSTHOG_CLI_TOKEN && process.env.POSTHOG_CLI_ENV_ID),
    project: `${process.env.GITHUB_REPO} (web)`,
    version: process.env.GITHUB_SHA,
  },
});
