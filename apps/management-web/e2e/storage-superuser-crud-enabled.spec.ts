import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * List/detail calls from the browser are mocked so table chrome is deterministic.
 *
 * Run via `npm run test:e2e:storage-enabled -w @podverse/management-web` (management-api must
 * report bucket storage enabled — see `playwright.storage-enabled.config.ts`).
 */

function mockStorageListRoutes(page: Page) {
  return page.route('**/api/v2/storage/objects**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const continuationToken = url.searchParams.get('continuationToken');
    const prefix = url.searchParams.get('prefix') ?? '';

    if (continuationToken === null || continuationToken === '') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          objects: [
            {
              key: 'e2e-fixture/object-one.bin',
              size: 128,
              etag: '"abc"',
              lastModified: '2026-05-07T12:00:00.000Z',
            },
          ],
          nextContinuationToken: 'token-page-2',
          isTruncated: true,
          prefix,
        }),
      });
      return;
    }

    if (continuationToken === 'token-page-2') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          objects: [
            {
              key: 'e2e-fixture/object-two.bin',
              size: 256,
              etag: '"def"',
              lastModified: '2026-05-07T13:00:00.000Z',
            },
          ],
          nextContinuationToken: null,
          isTruncated: false,
          prefix,
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Management-web object storage for the superuser', () => {
  test('when storage is enabled, the list uses shared table chrome: prefix filter, bulk bar, and cursor pagination', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await mockStorageListRoutes(page);

    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/dashboard');

    await page.getByRole('link', { name: 'Object storage' }).click();

    await expect(page.getByRole('heading', { name: 'Object storage', level: 1 })).toBeVisible();

    await expect(page.getByPlaceholder('Filter by key prefix')).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'e2e-fixture/object-one.bin', exact: true })
    ).toBeVisible();

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();
    await expect(page.getByText('1 object selected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bulk delete' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(page.getByText('1 object selected')).not.toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The object storage list shows prefix filter, bulk selection bar, and first page rows.',
      page.getByRole('cell', { name: 'e2e-fixture/object-one.bin', exact: true })
    );

    await page.getByRole('button', { name: 'Next »' }).click();
    await expect(
      page.getByRole('cell', { name: 'e2e-fixture/object-two.bin', exact: true })
    ).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Cursor pagination shows the second page of object storage results.',
      page.getByRole('cell', { name: 'e2e-fixture/object-two.bin', exact: true })
    );

    await page.getByRole('button', { name: '« Previous' }).click();
    await expect(
      page.getByRole('cell', { name: 'e2e-fixture/object-one.bin', exact: true })
    ).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Previous pagination returns to the first page of object storage results.',
      page.getByRole('cell', { name: 'e2e-fixture/object-one.bin', exact: true })
    );
  });
});
