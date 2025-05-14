/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "my-app",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: ["prod"].includes(input?.stage),
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

    // Apply default copy all the files to the layer...
    $transform(sst.aws.Function, (args) => {
      // Link the secrets
      args.link ??= secrets;
      // Add any environment variables
      args.environment = {
        // Add this so that AWS will re-use TCP connections instead of re-connecting every time
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      };
      // Copy prisma files over to our functions
      args.copyFiles ??= $dev
        ? []
        : [
            {
              from: "node_modules/.prisma",
              to: "node_modules/.prisma",
            },
            {
              from: "./node_modules/@prisma/client",
              to: "node_modules/@prisma/client",
            },
            {
              from: "node_modules/prisma",
              to: "node_modules/prisma",
            },
          ];
      args.nodejs ??= $dev
        ? {
            install: ["@prisma/client"],
          }
        : {
            esbuild: {
              platform: "node",
              external: ["@prisma/client"],
            },
          };
      // Select the architecture and runtime
      args.architecture ??= "arm64";
      args.runtime ??= "nodejs20.x";
    });

    // Import other stacks
    const { api } = await import("./infra/api");
  },
});
