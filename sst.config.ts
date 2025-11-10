/// <reference path="./.sst/platform/config.d.ts" />

// The config that manages our SST application / deployments
export default $config({
  app(input) {
    return {
      name: 'my-app',
      removal: input?.stage === 'prod' ? 'retain' : 'remove',
      protect: ['prod'].includes(input?.stage),
      home: 'aws',
    };
  },
  async run() {
    // ---------- LOCAL DB ----------
    // Start DB connection when running the dev command
    new sst.x.DevCommand('DB', {
      dev: {
        autostart: true,
        command: 'pnpm backend db:start',
      },
    });

    // ---------- SECRETS ----------
    // Import secrets first since other stacks might need them
    const secrets = await import('./infra/secrets');

    // ---------- FUNCTION DEFAULTS ----------
    // Apply default settings to all functions
    $transform(sst.aws.Function, (args) => {
      // ---------- SECRETS ----------
      // Link the secrets to every method
      args.link = ([] as unknown[]).concat(
        (args.link as unknown[]) || [],
        Object.values(secrets)
      );

      // ---------- PERMISSIONS ----------
      // Add permissions for the Bedrock AI API
      args.permissions ??= [];
      if (Array.isArray(args.permissions)) {
        args.permissions.push({
          effect: 'allow',
          actions: ['bedrock:*', 'aws-marketplace:*'],
          resources: ['*'],
        });
      }

      // ---------- SOURCE MAP UPLOAD ----------
      // Upload our function source maps to PostHog after building the functions
      args.hook ??= {
        postbuild: async (dir) => {
          // Upload backend sourcemaps to PostHog after build (if we're running in the CI)
          if (
            !process.env.SKIP_SOURCEMAPS &&
            process.env.POSTHOG_CLI_ENV_ID &&
            process.env.POSTHOG_CLI_TOKEN &&
            process.env.GITHUB_REPO &&
            process.env.GITHUB_SHA
          ) {
            try {
              // Check if this build dir contains source maps
              const fs = await import('node:fs/promises');
              let hasSourceMaps = false;
              const files = await fs.readdir(dir);
              hasSourceMaps = files.some((file) => file.endsWith('.map'));

              // Only run if the dir contains source map files
              if (hasSourceMaps) {
                const { execSync } = await import('node:child_process');

                // Inject sourcemaps with posthog metadata
                execSync(
                  `pnpm exec posthog-cli sourcemap inject --directory ${dir}`,
                  {
                    stdio: 'inherit',
                  }
                );
                // Upload sourcemaps
                execSync(
                  `pnpm exec posthog-cli sourcemap upload --directory ${dir} --project "${process.env.GITHUB_REPO} (backend)" --version ${process.env.GITHUB_SHA}`,
                  { stdio: 'inherit' }
                );
              }
            } catch (error) {
              console.error('❌ PostHog sourcemap upload failed:', error);
            }
          }
        },
      };

      // ---------- ENVIRONMENT ----------
      // Add any environment variables
      args.environment ??= {
        // Add this so that AWS will re-use TCP connections instead of re-connecting every time
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      };
      // Copy prisma files over to our functions (not needed for local development)
      args.copyFiles ??= $dev
        ? []
        : [
            {
              from: 'node_modules/.prisma',
              to: 'node_modules/.prisma',
            },
            {
              from: 'node_modules/@prisma/client',
              to: 'node_modules/@prisma/client',
            },
            {
              from: 'node_modules/prisma',
              to: 'node_modules/prisma',
            },
          ];
      // Set any default node options
      args.nodejs ??= $dev
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
          };

      // ---------- RUNTIME ----------
      // Select the architecture and runtime
      args.architecture ??= 'arm64';
      args.runtime ??= 'nodejs20.x';
    });

    // ---------- MAIN ----------
    // SST fails if you run `sst shell` without a corresponding stage being deployed.
    // This causes our CI to fail unless we deploy something first. To ensure we keep it
    // speedy the first time (and this should only deploy once), we create a minimal stage
    // and just skip the rest of the deployment.
    if ($app.stage === 'minimal') {
      return;
    }

    // Import primary application stacks
    await import('./infra/api');
    await import('./infra/web');
    await import('./infra/ping-db');
    // Optional docs site
    // await import('./infra/docs');
  },
});
