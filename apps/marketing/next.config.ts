import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produce a pure static export (plain HTML/CSS/JS, no server runtime) since this
  // site is deployed via sst.aws.StaticSite rather than sst.aws.Nextjs
  output: 'export',
  // Static export can't use the server-based image optimization API
  images: {
    unoptimized: true,
  },
  // Transpile the packages so we can use them in this app
  transpilePackages: ['@repo/design', '@repo/config'],
  // We validate the types manually, so we'll just skip it here
  typescript: {
    ignoreBuildErrors: true,
  },
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
