import { expect, test } from '@playwright/test';

test.describe('Management-web smoke', () => {
  test('login page loads successfully', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
