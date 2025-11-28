// NOTE: We have to do a somewhat complex dance to get the
// correct path for each tsconfig.json file to run type checks

import { EventEmitter } from 'node:events';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Raise the max event listener limit for lint-staged
EventEmitter.defaultMaxListeners = 30;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Our standard methods (applied to various files)
const pretty = 'bun prettier --write';
const tsc = 'tsc --noEmit';

/** Get all packages in workspace directories */
const getWorkspacePackages = () => {
  /** The directories where we have our packages */
  const WORKSPACE_DIRS = ['apps', 'packages'];
  const packages = [];

  for (const baseDir of WORKSPACE_DIRS) {
    const fullPath = path.join(__dirname, baseDir);

    if (existsSync(fullPath)) {
      const dirs = readdirSync(fullPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => `${baseDir}/${dirent.name}`);
      packages.push(...dirs);
    }
  }

  return packages;
};

/** Check which packages have their own tsconfig.json */
const getPackagesWithTsconfig = () => {
  const packages = getWorkspacePackages();
  return packages.filter((pkg) => {
    const tsconfigPath = path.join(__dirname, pkg, 'tsconfig.json');
    return existsSync(tsconfigPath);
  });
};
const packagesWithTsconfig = getPackagesWithTsconfig();

/** Generate dynamic lint-staged configuration */
const generateWorkspaceTypeChecks = () => {
  const config = {};

  // Generate TypeScript checking blocks for each workspace with its specific tsconfig
  for (const pkg of packagesWithTsconfig) {
    const pattern = `${pkg}/**/*.{js,jsx,ts,tsx}`;
    const tsconfigPath = `${pkg}/tsconfig.json`;

    config[pattern] = [() => `${tsc} -p ${tsconfigPath}`];
  }

  return config;
};

// Note: These match in the order they're defined (so we won't run more than one block)
export default {
  // Note: We run ultracite outside of lint-staged in our pre-commit script because it's faster to check everything at once
  // ['ultracite fix'],
  // Pretty format files that biome doesn't support
  '*.{md,yml,yaml}': [pretty],
  // We'll run our root type checker once to ensure we check files outside our workspace
  '**/*.{ts,tsx}': [() => tsc],
  // Type check all files in the workspace dynamically (we need to do this since they all need different tsconfig paths)
  ...generateWorkspaceTypeChecks(),
};
