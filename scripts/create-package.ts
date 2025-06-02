import path from 'node:path';

import { copyAndReplace } from './utils/copy';
// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
const [, , packageName] = process.argv;

if (!packageName) {
  console.error('Usage: pnpm create:package <packageName>');
  process.exit(1);
}

console.log('PACKAGE', packageName);

const templateDir = path.resolve(import.meta.dirname, '../templates/package');
const targetDir = path.resolve(import.meta.dirname, `../packages/${packageName}`);

copyAndReplace(templateDir, targetDir, {
  packageName: packageName,
});
console.log(`New package created at /packages/${packageName}"`);
