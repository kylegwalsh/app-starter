import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/design', '@repo/config'],
  typescript: { ignoreBuildErrors: true },
  // Override the webpack config for custom functionality
  webpack: (config) => {
    // Prefer .web files over normal files so browser-safe variants of shared packages are used
    // (e.g., packages/config/env/index.web.ts avoids importing `sst` which requires `fs`)
    // oxlint-disable no-unsafe-assignment, no-unsafe-member-access: The config is not fully typed
    config.resolve.extensions = config.resolve.extensions.flatMap((ext: string) => [
      `.web${ext}`,
      ext,
    ]);

    return config;
  },
};

export default nextConfig;
