import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

let nextConfig: NextConfig = {
  // Transpile the packages so we can use them in the web app
  transpilePackages: ['@repo/design', '@repo/config'],
  // We validate the types manually, so we'll just skip it here (the trpc routes complain anyways)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Override the webpack config for custom functionality
  webpack: (config: unknown) => {
    // Ensure the web always grabs the .web.ts files over the normal files (so it can share directories with the backend)
    // @ts-expect-error - Next doesn't type the config correctly
    // eslint-disable-next-line
    config.resolve.extensions.unshift('.web.ts');

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
    eslint: {
      ignoreDuringBuilds: true,
    },
  } satisfies NextConfig);
}

export default nextConfig;
