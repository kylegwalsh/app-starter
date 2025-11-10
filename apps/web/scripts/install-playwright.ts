import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Marker file to indicate Playwright has already been installed (placed in project root)
const markerFile = path.join(process.cwd(), '.playwright-installed');

try {
  // If the marker file exists, Playwright is already installed; skip installation
  if (fs.existsSync(markerFile)) {
    console.log('[postinstall] Playwright already installed, skipping...');
    process.exit(0);
  }

  // Install Playwright's Chromium browser with dependencies
  console.log('[postinstall] Installing Playwright (chromium)...');
  execSync('npx playwright install chromium --with-deps', {
    stdio: 'inherit',
  });

  // Write a marker file with a timestamp to avoid redundant installs
  const timestamp = new Date().toISOString();
  fs.writeFileSync(markerFile, `installedAt=${timestamp}\n`, {
    encoding: 'utf8',
  });
  console.log('[postinstall] Playwright installed');
} catch (error) {
  // Log the error and exit with failure code if installation fails
  console.error(
    '[postinstall] Playwright install failed:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
