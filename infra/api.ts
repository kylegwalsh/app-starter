import { execSync } from 'node:child_process';

// Our main backend API
export const api = new sst.aws.ApiGatewayV2('api');

/** We use one function for all of our routes (handled by tRPC + openapi) */
const apiHandler = new sst.aws.Function('apiHandler', {
  handler: 'apps/backend/functions/api.handler',
  link: [api],
  hook: {
    postbuild: async (dir) => {
      // Upload backend sourcemaps to PostHog after build
      if (
        !process.env.SKIP_SOURCEMAPS &&
        process.env.POSTHOG_CLI_ENV_ID &&
        process.env.POSTHOG_CLI_TOKEN &&
        process.env.GITHUB_REPO &&
        process.env.GITHUB_SHA
      ) {
        try {
          // Inject sourcemaps with posthog metadata
          execSync(`pnpm exec posthog-cli sourcemap inject --directory ${dir}`, {
            stdio: 'inherit',
          });
          // Upload sourcemaps
          execSync(
            `pnpm exec posthog-cli sourcemap upload --directory ${dir} --project "${process.env.GITHUB_REPO} (backend)" --version ${process.env.GITHUB_SHA}`,
            { stdio: 'inherit' }
          );
          console.log('✔ Uploaded backend sourcemaps to PostHog.');
        } catch (error) {
          console.error('PostHog sourcemap upload failed:', error);
        }
      } else {
        console.log('PostHog env vars not set, skipping backend sourcemap upload.');
      }
      await Promise.resolve();
    },
  },
});

// tRPC routes
api.route('GET /trpc/{path+}', apiHandler.arn);
api.route('POST /trpc/{path+}', apiHandler.arn);

// REST routes
api.route('GET /api/{path+}', apiHandler.arn);
api.route('POST /api/{path+}', apiHandler.arn);
api.route('PUT /api/{path+}', apiHandler.arn);
api.route('DELETE /api/{path+}', apiHandler.arn);
api.route('PATCH /api/{path+}', apiHandler.arn);

// Swagger docs (for REST routes)
api.route('GET /docs', apiHandler.arn);
