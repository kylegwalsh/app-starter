import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as path from "path";

// Create temporary directories for bundling
const prismaLayerDir = path.join(__dirname, "prisma-layer");

// Clean up existing layer directories if they exist
if (fs.existsSync(prismaLayerDir)) {
  fs.rmSync(prismaLayerDir, { recursive: true });
}

// Set up prisma layer
const prismaNodeModulesDir = path.join(
  prismaLayerDir,
  "nodejs",
  "node_modules"
);
fs.mkdirSync(prismaNodeModulesDir, { recursive: true });

// Copy Prisma client files
const prismaClientPath = path.join(
  __dirname,
  "../..",
  "node_modules/.prisma/client"
);
fs.cpSync(prismaClientPath, path.join(prismaNodeModulesDir, ".prisma/client"), {
  recursive: true,
});

// Create prisma layer
export const prismaLayer = new aws.lambda.LayerVersion("prismaLayer", {
  compatibleRuntimes: ["nodejs18.x", "nodejs20.x"],
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive(prismaLayerDir),
  }),
  description: "Lambda layer containing Prisma client",
  layerName: "prismaLayer",
});
