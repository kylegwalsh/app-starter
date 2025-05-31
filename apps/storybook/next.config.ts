import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the packages so we can use them in the app
  transpilePackages: ['@repo/design'],
};

export default nextConfig;
