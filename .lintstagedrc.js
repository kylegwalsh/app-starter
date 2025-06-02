// NOTE: We have to do a somewhat complex dance to get the
// correct path for each tsconfig.json file to run type checks
import path from 'path';
import { existsSync, readdirSync } from 'fs';

// Our standard methods (applied to various files)
const pretty = 'pnpm exec prettier --write';
const eslint = 'pnpm exec eslint --fix';
const tsc = 'tsc --noEmit';

/** The directories where we have our packages */
const WORKSPACE_DIRS = ['apps', 'packages'];

/** Get all packages in workspace directories */
const getWorkspacePackages = () => {
  const packages = [];

  WORKSPACE_DIRS.forEach((baseDir) => {
    const fullPath = path.join(import.meta.dirname, baseDir);

    if (existsSync(fullPath)) {
      const dirs = readdirSync(fullPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => `${baseDir}/${dirent.name}`);
      packages.push(...dirs);
    }
  });

  return packages;
};

/** Check which packages have their own tsconfig.json */
const getPackagesWithTsconfig = () => {
  const packages = getWorkspacePackages();
  return packages.filter((pkg) => {
    const tsconfigPath = path.join(import.meta.dirname, pkg, 'tsconfig.json');
    return existsSync(tsconfigPath);
  });
};

/** Generate dynamic lint-staged configuration */
const generateWorkspaceTypeChecks = () => {
  const packagesWithTsconfig = getPackagesWithTsconfig();
  const config = {};

  // Generate TypeScript checking blocks for each workspace with its specific tsconfig
  packagesWithTsconfig.forEach((pkg) => {
    const pattern = `${pkg}/**/*.{js,jsx,ts,tsx}`;
    const tsconfigPath = `${pkg}/tsconfig.json`;

    config[pattern] = [() => `${tsc} -p ${tsconfigPath}`];
  });

  return config;
};

// Note: These match in the order they're defined (so we won't run more than one block)
export default {
  // Perform our base formatting tasks on all JS / TS
  '!{apps,packages}/**/*.{js,jsx,ts,tsx}': [eslint, pretty],
  // Pretty format non JS / TS files
  '*.{json,md,yml,yaml}': [pretty],
  // Also type check all files outside of the workspace
  '!{apps,packages}/**/*.{ts,tsx}': [() => tsc],
  // Type check all files in the workspace dynamically (we need to do this since they all need different tsconfig paths)
  ...generateWorkspaceTypeChecks(),
};
