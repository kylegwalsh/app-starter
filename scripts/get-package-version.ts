import fs from 'node:fs';
import path from 'node:path';

/**
 * Usage:
 *   tsx scripts/get-package-version.ts --package <package-name> [--path <package.json path or directory>]
 * Example:
 *   tsx scripts/get-package-version.ts --package sst
 *   tsx scripts/get-package-version.ts --package playwright --path ./apps/storybook
 *   tsx scripts/get-package-version.ts --package playwright --path ./apps/storybook/package.json
 */

// Parse arguments
let pkgName = '';
let pkgJsonPath = './package.json';

for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--package' && process.argv[i + 1]) {
    pkgName = process.argv[i + 1];
    i++;
  } else if (process.argv[i] === '--path' && process.argv[i + 1]) {
    pkgJsonPath = process.argv[i + 1];
    i++;
  }
}

// Print usage and exit if --package is missing
if (!pkgName) {
  console.error(
    'Usage: tsx scripts/get-package-version.ts --package <package-name> [--path <package.json path or directory>]'
  );
  process.exit(1);
}

// Resolve the package.json path
let absPath = path.resolve(pkgJsonPath);
// If a directory is provided, append 'package.json'
if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
  absPath = path.join(absPath, 'package.json');
}

// Check if package.json exists
if (!fs.existsSync(absPath)) {
  console.error(`package.json not found at: ${absPath}`);
  process.exit(1);
}

// Read and parse package.json
const pkgJson = JSON.parse(fs.readFileSync(absPath, 'utf8'));
// Try to find the version in dependencies or devDependencies
const version =
  (pkgJson.dependencies && pkgJson.dependencies[pkgName]) ||
  (pkgJson.devDependencies && pkgJson.devDependencies[pkgName]);

// Print error if the package is not found
if (!version) {
  console.error(`Package '${pkgName}' not found in ${absPath}`);
  process.exit(1);
}

// Output the version to stdout
console.log(version);
