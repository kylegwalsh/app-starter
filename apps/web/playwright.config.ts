import { defineConfig, devices } from '@playwright/test';
import { Resource } from 'sst';

// Sets up our playwright test environment
// https://playwright.dev/docs/test-configuration
export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: 'tests/e2e',
  testMatch: '*.test.ts',
  // Run all tests in parallel.
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,
  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use
  reporter: 'html',
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://localhost:3000',
    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',
  },
  // Configure projects for major browsers.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run your local dev server before starting the tests.
  webServer: {
    cwd: '../..',
    command: 'pnpm sst dev',
    // In our CI, we will test using the deployed URL
    url: process.env.CI ? Resource.web.url : 'http://localhost:3000',
    // Don't allow the CI to spin up a new instance if it can't find the deployment
    reuseExistingServer: process.env.CI ? false : true,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000, // 3 minutes
  },
});
