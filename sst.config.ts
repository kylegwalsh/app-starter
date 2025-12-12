import type { SSTConfig } from 'sst';

import { ApiStack } from './infra/api';
import { PingDbStack } from './infra/ping-db';
import { SecretsStack } from './infra/secrets';
import { WebStack } from './infra/web';
// import { DocsStack } from "./infra/docs";

// The config that manages our SST application / deployments (SST v2)
export default {
  config() {
    return {
      name: 'my-app',
      region: 'us-east-1',
    };
  },
  stacks(app) {
    // ---------- FUNCTION DEFAULTS ----------
    // Apply default settings to all functions
    app.setDefaultFunctionProps((_stack) => ({
      // Runtime configuration
      runtime: 'nodejs22.x',
      architecture: 'arm_64',
      // Add any environment variables
      environment: {
        // Re-use TCP connections instead of re-connecting every time
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      // Copy prisma files over to our functions (not needed for local development)
      copyFiles: app.local
        ? []
        : [
            { from: 'node_modules/.prisma', to: 'node_modules/.prisma' },
            {
              from: 'node_modules/@prisma/client',
              to: 'node_modules/@prisma/client',
            },
            { from: 'node_modules/prisma', to: 'node_modules/prisma' },
          ],
      nodejs: app.local
        ? {
            // Exclude prisma from our local functions
            install: ['@prisma/client'],
          }
        : {
            // Generate source maps for our deployments so we can upload them for error tracking
            sourcemap: true,
            // Copy the necessary prisma files over to our functions
            esbuild: {
              platform: 'node',
              external: ['@prisma/client'],
            },
          },
    }));

    // ---------- MAIN ----------
    // All infrastructure stacks
    app.stack(SecretsStack);
    app.stack(ApiStack);
    app.stack(WebStack);
    app.stack(PingDbStack);
    // Optional docs site
    // app.stack(DocsStack);
  },
} satisfies SSTConfig;
