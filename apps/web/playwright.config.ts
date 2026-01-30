import { defineConfig, devices } from '@playwright/test';
import { config } from '@repo/config';

// Sets up our playwright test environment
// https://playwright.dev/docs/test-configuration
export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file
  testDir: 'tests/e2e',
  testMatch: '*.test.ts',
  // Ensure our timeout is long enough for slow Next.js compilation
  timeout: 60_000,
  // Run all tests in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  retries: 2,
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use
  reporter: 'html',
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.CI ? config.app.url : 'http://localhost:3000',
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    // Capture screenshot on failure
    screenshot: 'on-first-failure',
  },
  // Configure projects for major browsers
  projects: [
    // Setup project - we run sign up test first to authenticate
    {
      name: 'setup',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: 'signup.test.ts',
    },
    // Main tests - run after setup, use saved auth state
    {
      name: 'main',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: 'signup.test.ts',
    },
  ],
  // In CI, don't configure webServer - just use baseURL for the deployed app
  webServer: process.env.CI
    ? undefined
    : {
        // Run your local dev server before starting the tests
        cwd: '../..',
        // Start the dev apps
        command: 'bun dev',
        port: 3000,
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 180_000, // 3 minutes
      },
});
