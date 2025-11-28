import { execSync } from 'node:child_process';

// Get staged files
const stagedFiles = execSync('git diff --cached --name-only', {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

// Check if any web files are being committed
const webPatterns = [/^apps\/web\//];
const hasWebChanges = stagedFiles.some((file) =>
  webPatterns.some((pattern) => pattern.test(file))
);

// If we are committing web files, we need to generate the backend types
// first because the web relies on backend routes for tRPC
if (hasWebChanges) {
  console.log('Web files detected in commit, generating backend types...');
  execSync('bun backend types:generate', {
    stdio: 'inherit',
  });
} else {
  console.log(
    'No frontend files in commit, skipping backend types generation...'
  );
}

// Lint all files with ultracite (faster to run all at once)
console.log('Linting all files with ultracite...');
execSync('bun ultracite fix', {
  stdio: 'inherit',
});

// Run lint-staged (remaining type and formatting checks)
execSync('bun lint-staged', {
  stdio: 'inherit',
});
