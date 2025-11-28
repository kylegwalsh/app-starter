import { test } from '@playwright/test';

/** The file to save the auth state to */
const authFile = 'tests/e2e/.auth/user.json';

test('user can sign up and access the app', async ({ page }) => {
  // Generate unique email for this test run
  const timestamp = Date.now();
  const testUser = {
    name: 'Test User',
    email: `test+${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  // Sign up
  await page.goto('/auth/sign-up');
  await page.locator('input[name="name"]').fill(testUser.name);
  await page.locator('input[name="email"]').fill(testUser.email);
  await page.locator('input[name="password"]').fill(testUser.password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to app
  await page.waitForURL(/^(?!.*\/auth\/).*/);

  // Save auth state for other tests
  await page.context().storageState({ path: authFile });
});
