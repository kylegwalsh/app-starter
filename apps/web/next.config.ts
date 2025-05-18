import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the packages so we can use them in the web app
  transpilePackages: ['@lib/ui', '@lib/config'],
  // Override the webpack config for custom functionality
  webpack: (config: unknown) => {
    // Ensure the web always grabs the .web.ts files over the normal files (so it can share directories with the backend)
    // @ts-expect-error - Next doesn't type the config correctly
    // eslint-disable-next-line
    config.resolve.extensions.unshift('.web.ts');

    return config;
  },
};

export default nextConfig;
