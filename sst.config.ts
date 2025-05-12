/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "my-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // Start DB connection when running the dev command
    new sst.x.DevCommand("DB", {
      dev: {
        autostart: true,
        command: "pnpm backend db:start",
      },
    });

    // Import secrets first since other stacks might need them
    const { secrets } = await import("./infra/secrets");

    const { prismaLayer } = await import("./infra/layers");

    // Apply default copy all the files to the layer...
    $transform(sst.aws.Function, (args, opts) => {
      // Link the secrets
      args.link ??= secrets;
      // Add the prisma layer
      args.layers ??= [prismaLayer.arn];
      // Add the environment variables
      args.environment = {
        // Add this so that AWS will re-use TCP connections instead of re-connecting every time
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        // Prisma query engine library
        ...(!$dev
          ? {
              PRISMA_QUERY_ENGINE_LIBRARY:
                "/opt/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
            }
          : {}),
      };
    });

    // Import other stacks
    const { api } = await import("./infra/api");
  },
});
