import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */
test.describe('Management-web object storage when the bucket feature is off', () => {
  test('the dashboard hides the storage tile and the storage route redirects away', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);

    await page.goto(ROUTES.HOME);

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    await expect(page.getByRole('link', { name: 'Object storage' })).toHaveCount(0);

    await page.goto(ROUTES.STORAGE);

    await page.waitForURL('**/dashboard');

    await capturePageLoad(
      page,
      testInfo,
      'When storage is disabled, visiting /storage redirects back to the dashboard.',
      page.getByRole('heading', { level: 1 })
    );
  });
});
