import { expect, test } from '@playwright/test';

test('app loads and displays the homepage', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/./);
});
