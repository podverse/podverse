import { expect, test } from '@playwright/test';

import { buildDatabaseTablePath, ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * Database meta + query responses are mocked so the browser page does not depend on DB rows.
 */

const MOCK_META = {
  tableName: 'feed',
  primaryKeyField: 'id',
  fields: [
    {
      name: 'id',
      type: 'integer',
      nullable: false,
      updatable: false,
    },
    {
      name: 'url',
      type: 'text',
      nullable: true,
      updatable: true,
    },
  ],
  defaultSortField: 'id',
  defaultSortDirection: 'ASC',
  maxPageSize: 100,
  readOnly: false,
};

const MOCK_ROWS = [{ id: 424242, url: 'https://example.com/e2e-feed.xml' }];

test.describe('Management-web database table browser', () => {
  test('when meta and query succeed, the table shows sort controls and a row view link', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/api/v2/database/feed/meta', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_META),
      });
    });

    await page.route('**/api/v2/database/feed/query', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rows: MOCK_ROWS,
          total: 1,
        }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(buildDatabaseTablePath('feed'));
    await expect(page).toHaveURL(/\/database\/feed$/);

    await expect(page.getByRole('button', { name: 'Sort by url' })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'https://example.com/e2e-feed.xml', exact: true })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'View 424242' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The database feed table shows sort controls and a row view link.',
      page.getByRole('link', { name: 'View 424242' })
    );
  });
});
