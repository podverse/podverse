import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management layout navbar chrome', () => {
  test('the dashboard shows the management shell bar with a dashboard brand link and account menu', async ({
    page,
  }) => {
    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    const chrome = page.locator('[data-appearance="management"]');
    await expect(chrome).toBeVisible();

    const brandToDashboard = chrome.locator('a[href="/dashboard"]').first();
    await expect(brandToDashboard).toBeVisible();
    await expect(brandToDashboard).not.toHaveText('');

    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(page.getByText(/Role:/)).toBeVisible();
  });
});
