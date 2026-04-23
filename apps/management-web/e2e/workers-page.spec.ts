import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web workers page', () => {
  test('signed-in superuser sees worker command catalog', async ({ page }) => {
    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    await page.goto('/workers');

    const title = page.getByRole('heading', { name: 'Workers', level: 1 });
    await expect(title).toBeVisible();

    const mqRss = page.getByText('mqRSSAdd', { exact: true });
    await expect(mqRss.first()).toBeVisible();
  });
});
