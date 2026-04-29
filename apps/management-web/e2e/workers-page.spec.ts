import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web workers page', () => {
  test('signed-in superuser sees worker command catalog', async ({ page }) => {
    test.setTimeout(30_000);

    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    await page.goto('/workers');

    const title = page.getByRole('heading', { name: 'Workers', level: 1 });
    await expect(title).toBeVisible();

    // Commands load async and sit inside collapsible <details>; expand the MQ category (en-US label).
    const mqCategorySummary = page.locator('summary').filter({ hasText: /^Message queue$/ });
    await expect(mqCategorySummary).toBeVisible({ timeout: 15_000 });
    await mqCategorySummary.click();

    const mqRss = page.getByText('mqRSSAdd', { exact: true });
    await expect(mqRss.first()).toBeVisible();
  });
});
