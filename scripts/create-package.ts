import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyAndReplace } from './utils/copy';

// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
const [, , packageName] = process.argv;

if (!packageName) {
  console.error('Usage: pnpm create:package <packageName>');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateDir = path.resolve(__dirname, '../templates/package');
const targetDir = path.resolve(__dirname, `../packages/${packageName}`);

copyAndReplace(templateDir, targetDir, {
  packageName: packageName,
});
console.log(`New package created at /packages/${packageName}"`);
