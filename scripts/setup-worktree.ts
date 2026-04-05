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
 *   2. Symlinks the entire .sst directory from the main worktree so SST
 *      global types ($app, sst), generated Resource types, and deployment
 *      state are all available. Uses a directory junction on Windows
 *      (no admin rights required).
 */

import { execSync } from 'node:child_process';
import { existsSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Resolve the main repo root via git's common dir
// In a worktree, `git rev-parse --git-common-dir` returns the path to the
// main .git directory (e.g. /path/to/repo/.git).
const gitCommonDir = execSync('git rev-parse --git-common-dir', {
  encoding: 'utf8',
}).trim();

const mainRoot = dirname(resolve(gitCommonDir));

// Guard: don't run in the main repo itself
if (process.cwd() === mainRoot) {
  console.log('Not in a worktree, skipping setup.');
  process.exit(0);
}

const sstSrc = join(mainRoot, '.sst');
const sstDest = join(process.cwd(), '.sst');

// 1. Install dependencies
console.log('Installing dependencies...');
execSync('bun install', { stdio: 'inherit' });

// 2. Link .sst
if (!existsSync(sstSrc)) {
  console.error(
    `\n.sst not found at: ${sstSrc}\nRun 'sst dev' or 'bun dev' in the main repo first to generate SST types.\n`,
  );
  process.exit(1);
}

if (existsSync(sstDest)) {
  console.log('.sst already linked, skipping.');
} else {
  // 'junction' works without elevated privileges on Windows; behaves as a
  // regular symlink on macOS/Linux.
  symlinkSync(sstSrc, sstDest, 'junction');
  console.log(`Linked .sst -> ${sstSrc}`);
}

console.log('\nWorktree setup complete.');
