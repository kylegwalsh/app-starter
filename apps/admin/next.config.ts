import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/design', '@repo/config'],
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    // Prefer .web files over normal files so browser-safe variants of shared packages are used
    // (e.g., packages/config/env/index.web.ts avoids importing `sst` which requires `fs`)
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'].flatMap((ext) => [
      `.web${ext}`,
      ext,
    ]),
  },
};

export default nextConfig;
