import { expect, test } from '@playwright/test';

test.describe('Main layout navbar chrome', () => {
  test('the home page shows account menu and history controls on a wide viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const chrome = page.locator('[data-appearance="web"]');
    await expect(chrome).toBeVisible();

    await expect(chrome.getByRole('button', { name: 'Account' })).toBeVisible();
    await expect(chrome.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(chrome.getByRole('button', { name: 'Forward' })).toBeVisible();
  });

  test('a narrow viewport shows search, the mobile menu toggle in its closed state', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const chrome = page.locator('[data-appearance="web"]');
    await expect(chrome.getByRole('link', { name: 'Search' })).toBeVisible();
    await expect(chrome.getByRole('button', { name: 'Open menu' })).toBeVisible();
  });
});
