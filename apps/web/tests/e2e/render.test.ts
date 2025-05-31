import { expect, test } from '@playwright/test';

test('app loads and displays the homepage', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await expect(page).toHaveTitle(/./);
});
