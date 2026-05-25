import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */

const MOCK_STATS_ROW = {
  id: 4242,
  title: 'E2E stats mock title',
  day_current_count: 3,
  day_1_count: 2,
  day_2_count: 1,
  day_3_count: 0,
  day_4_count: 0,
  day_5_count: 0,
  day_6_count: 0,
  day_7_count: 0,
  day_8_count: 0,
  week_current_count: 10,
  week_1_count: 5,
  week_2_count: 0,
  week_3_count: 0,
  week_4_count: 0,
  month_current_count: 20,
  month_1_count: 0,
  all_time_count: 999,
  range_count: 42,
};

test.describe('Management-web stats page', () => {
  test('When a superuser opens the stats page with mocked stats API responses, they can switch the entity tab, open a table row, and use the close control in the detail panel.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route(/\/stats\/[a-z]+\/top(?:\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: [MOCK_STATS_ROW],
          total: 1,
          page: 1,
          pageSize: 25,
        }),
      });
    });

    await page.route(/\/stats\/[a-z]+\/\d+(?:\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STATS_ROW),
      });
    });

    await page.goto('/');
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/stats');
    await expect(page).toHaveURL(/\/stats$/);

    await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Sort by Title' })).toBeVisible();

    await page.getByRole('button', { name: 'Items' }).click();
    await expect(page.getByText(/Top 10 Items/)).toBeVisible();

    await page.getByRole('row', { name: /E2E stats mock title/ }).click();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'E2E stats mock title', level: 3 })
    ).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The stats detail panel opens for the selected row on the Items tab.',
      page.getByRole('heading', { name: 'E2E stats mock title', level: 3 })
    );

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Close' })).not.toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The stats detail panel closes and returns to the table view.',
      page.getByRole('heading', { name: 'Stats', level: 1 })
    );
  });
});
