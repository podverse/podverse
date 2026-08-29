import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * Admins list GET is mocked for deterministic table chrome.
 */

const MOCK_ADMIN = {
  id: 7001,
  id_text: 'e2e_admin_row',
  role: 'superuser',
  email: 'e2e-admin-row@example.com',
  username: null,
  permissions: {
    feeds_crud: 15,
    feed_takedown_reasons_crud: 0,
    admins_crud: 15,
    stats_crud: 15,
    billing_prices_crud: 0,
    bucket_crud: 0,
    embed_demo_crud: 0,
  },
  created_at: '2026-02-01T15:30:00.000Z',
};

test.describe('Management-web admins list', () => {
  test('when the admins API returns rows, the list shows sortable header buttons', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/api/v2/admins', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_ADMIN]),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(ROUTES.ADMINS);
    await expect(page).toHaveURL(/\/admins$/);
    await expect(page.getByRole('heading', { name: 'Admins', level: 1 })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Sort by Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sort by Username' })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'e2e-admin-row@example.com', exact: true })
    ).toBeVisible();
    const adminDataRow = page.locator('tbody tr').filter({ hasText: 'e2e_admin_row' });
    await expect(adminDataRow.getByRole('cell').nth(2)).toHaveText('-');

    await capturePageLoad(
      page,
      testInfo,
      'The admins list shows sortable headers and the mocked admin row.',
      page.getByRole('cell', { name: 'e2e-admin-row@example.com', exact: true })
    );
  });
});
