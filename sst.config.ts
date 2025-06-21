/// <reference path="./.sst/platform/config.d.ts" />

/** A lambda layer with the better stack logtail extension built and ready for use */
const LOG_LAYER_ARN = 'arn:aws:lambda:us-east-1:541250234814:layer:logtail-lambda-extension:22';

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
    // Start DB connection when running the dev command
    new sst.x.DevCommand('DB', {
      dev: {
        autostart: true,
        command: 'pnpm backend db:start',
      },
    });

    // Import secrets first since other stacks might need them
    const { secrets, BETTER_STACK_SOURCE_TOKEN, BETTER_STACK_INGESTING_URL } = await import(
      './infra/secrets'
    );

    // Apply default settings to all functions
    $transform(sst.aws.Function, (args) => {
      // Link the secrets to every method
      // eslint-disable-next-line unicorn/prefer-spread
      args.link = ([] as unknown[]).concat((args.link as unknown[]) || [], secrets);
      // Add any environment variables
      args.environment = {
        // Configure the env for logging
        LOGTAIL_TOKEN: BETTER_STACK_SOURCE_TOKEN.value,
        LOGTAIL_HTTP_API_URL: BETTER_STACK_INGESTING_URL.value,
        // Add this so that AWS will re-use TCP connections instead of re-connecting every time
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      };
      // Add our lambda layer to handle better stack logging (not needed for local development)
      args.layers ??= $dev ? [] : [LOG_LAYER_ARN];
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
      args.nodejs ??= $dev
        ? {
            install: ['@prisma/client'],
          }
        : {
            // Generate source maps for our deployments so we can upload them for error tracking
            sourcemap: true,
            esbuild: {
              platform: 'node',
              external: ['@prisma/client'],
            },
          };
      // Select the architecture and runtime
      args.architecture ??= 'arm64';
      args.runtime ??= 'nodejs20.x';
    });

    // Import other stacks
    await import('./infra/api');
    await import('./infra/web');
    await import('./infra/ping-db');
    // Optional docs site
    // await import('./infra/docs');
  },
});
