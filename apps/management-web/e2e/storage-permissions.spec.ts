import { expect, test } from '@playwright/test';

/**
 * E2E seed: admin e2e-nobucket@example.com / Test!1Aa (feeds read, no bucket read)
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web object storage for an admin without bucket read', () => {
  test('the dashboard hides the storage tile and the storage route redirects away', async ({
    page,
  }) => {
    test.setTimeout(30_000);

    await page.goto('/');

    await page.locator('#email').fill('e2e-nobucket@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    await expect(page.getByRole('link', { name: 'Object storage' })).toHaveCount(0);

    await page.goto('/storage');

    await page.waitForURL('**/dashboard');
  });
});
