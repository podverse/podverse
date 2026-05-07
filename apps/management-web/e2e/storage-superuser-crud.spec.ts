import { expect, test } from '@playwright/test';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * When management API reports bucket storage enabled, the UI lists objects (may be empty).
 */
test.describe('Management-web object storage for the superuser', () => {
  test('when the storage feature is enabled, the signed-in superuser can open the storage list page', async ({
    page,
  }) => {
    test.setTimeout(30_000);

    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    const storageLink = page.getByRole('link', { name: 'Object storage' });
    const storageCount = await storageLink.count();
    if (storageCount === 0) {
      test.skip(true, 'Bucket storage feature is disabled in this environment.');
    }

    await storageLink.click();

    await expect(page.getByRole('heading', { name: 'Object storage', level: 1 })).toBeVisible();
  });
});
