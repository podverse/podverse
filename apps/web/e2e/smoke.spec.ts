import { expect, test } from '@playwright/test';

test.describe('Web smoke', () => {
  test('home page loads successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/podverse/i);

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
