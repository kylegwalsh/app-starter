/**
 * Sets up a git worktree for development/linting.
 *
 * Run from within the worktree directory:
 *   bun setup-worktree   (if added to the worktree's package.json)
 * Or from the repo root:
 *   tsx scripts/setup-worktree.ts
 *
 * What it does:
 *   1. Installs dependencies (bun install)
 *   2. Symlinks .sst/platform from the main worktree so SST global types
 *      ($app, sst) are available for type-aware linting.
 *      Uses a directory junction on Windows (no admin rights required).
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Resolve the main repo root via git's common dir
// In a worktree, `git rev-parse --git-common-dir` returns the path to the
// main .git directory (e.g. /path/to/repo/.git).
const gitCommonDir = execSync('git rev-parse --git-common-dir', {
  encoding: 'utf8',
}).trim();

const mainRoot = dirname(resolve(gitCommonDir));
const platformSrc = join(mainRoot, '.sst', 'platform');
const sstDir = join(process.cwd(), '.sst');
const platformDest = join(sstDir, 'platform');

// 1. Install dependencies
console.log('Installing dependencies...');
execSync('bun install', { stdio: 'inherit' });

// 2. Link .sst/platform
if (!existsSync(platformSrc)) {
  console.error(
    `\n.sst/platform not found at: ${platformSrc}\nRun 'sst dev' or 'bun dev' in the main repo first to generate SST types.\n`,
  );
  process.exit(1);
}

if (existsSync(platformDest)) {
  console.log('.sst/platform already linked, skipping.');
} else {
  if (!existsSync(sstDir)) {
    mkdirSync(sstDir);
  }
  // 'junction' works without elevated privileges on Windows; behaves as a
  // regular symlink on macOS/Linux.
  symlinkSync(platformSrc, platformDest, 'junction');
  console.log(`Linked .sst/platform -> ${platformSrc}`);
}

console.log('\nWorktree setup complete.');
