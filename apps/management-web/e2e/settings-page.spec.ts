import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web settings page', () => {
  test('signed-in superuser sees language and theme selectors', async ({ page }) => {
    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'My Settings' }).click();
    await page.waitForURL('**/settings');

    const title = page.getByRole('heading', { name: 'Settings', level: 1 });
    await expect(title).toBeVisible();

    await expect(page.getByLabel('Theme')).toBeVisible();
    await expect(page.getByLabel('Language')).toBeVisible();
  });
});
