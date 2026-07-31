import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const SAMPLE_OPML_PATH = path.join(__dirname, 'fixtures/sample-opml-import.opml');

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

async function mockOpmlImportApis(
  page: Page,
  options?: { includeRateLimited?: boolean }
): Promise<void> {
  const includeRateLimited = options?.includeRateLimited === true;

  await page.route('**/api/v2/account/opml/import', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ request_id: 'e2e-opml-import' }),
    });
  });

  await page.route('**/api/v2/account/opml/import/status/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        requestId: 'e2e-opml-import',
        accountId: 1,
        status: 'completed',
        totals: {
          total: 2,
          subscribed: 1,
          enqueuedIndexed: 0,
          addedByRss: includeRateLimited ? 0 : 1,
          failed: 0,
          skippedExisting: 0,
          rateLimited: includeRateLimited ? 1 : 0,
        },
        ...(includeRateLimited
          ? {
              rateLimited: {
                limit: 50,
                retryAfterSeconds: 1800,
              },
            }
          : {}),
        results: [
          {
            feedUrl: 'https://example.com/e2e-directory.xml',
            title: 'E2E Directory Feed',
            outcome: 'subscribed',
          },
          {
            feedUrl: 'https://example.com/e2e-unknown.xml',
            title: 'E2E Unknown Feed',
            outcome: includeRateLimited ? 'rate_limited' : 'added_by_rss',
          },
        ],
        updatedAt: new Date().toISOString(),
      }),
    });
  });
}

test.describe('Settings OPML', () => {
  test('A logged-in user can open the OPML settings tab and download an OPML export file.', async ({
    page,
  }, testInfo) => {
    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Open the OPML settings tab and verify Import and Export are visible.', async () => {
      await page.goto('/settings?tab=opml');
      await expect(page).toHaveURL(/\/settings\?tab=opml/);
      await expect(page.getByRole('heading', { name: 'Import OPML' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Import OPML' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Export OPML' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export OPML' })).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The OPML settings tab shows Import and Export OPML sections.',
        page.getByRole('heading', { name: 'Import OPML' })
      );
    });

    await actionAndCapture(
      page,
      testInfo,
      'Clicking Export OPML starts an OPML file download.',
      async () => {
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export OPML' }).click();
        const download = await downloadPromise;
        const suggestedFilename = download.suggestedFilename();
        expect(suggestedFilename).toMatch(/podverse-opml-export-\d{4}-\d{2}-\d{2}\.opml/);

        // Verify the real backend export body is well-formed OPML (not just the filename).
        const downloadPath = await download.path();
        if (downloadPath === null) {
          throw new Error('OPML export download was not written to disk');
        }
        const opmlBody = await readFile(downloadPath, 'utf-8');
        expect(opmlBody).toContain('<opml');
        expect(opmlBody).toContain('<body>');
        expect(opmlBody.trimStart().startsWith('<?xml')).toBeTruthy();
      },
      page.getByRole('button', { name: 'Export OPML' })
    );
  });

  test('A logged-in user can import an OPML file and see the results summary.', async ({
    page,
  }, testInfo) => {
    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Mock OPML import enqueue and status APIs for a deterministic completed report.', async () => {
      await mockOpmlImportApis(page);
    });

    await test.step('Open the OPML settings tab.', async () => {
      await page.goto('/settings?tab=opml');
      await expect(page.getByRole('heading', { name: 'Import OPML' })).toBeVisible();
    });

    await actionAndCapture(
      page,
      testInfo,
      'Uploading a sample OPML file shows the import results summary.',
      async () => {
        await page.getByTestId('settings-opml-import-input').setInputFiles(SAMPLE_OPML_PATH);
        const results = page.getByTestId('settings-opml-import-results');
        await expect(results).toBeVisible();
        await expect(results).toContainText('2 feeds');
        await expect(results).toContainText('Subscribed');
        await expect(results).toContainText('Added by RSS');
        await expect(results).toContainText('E2E Directory Feed');
        await expect(results).toContainText('E2E Unknown Feed');
      },
      page.getByTestId('settings-opml-import-results')
    );
  });

  test('A rate-limited OPML import report opens the rate-limit modal.', async ({
    page,
  }, testInfo) => {
    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Mock OPML import APIs with a rate-limited completed report.', async () => {
      await mockOpmlImportApis(page, { includeRateLimited: true });
    });

    await test.step('Open the OPML settings tab and upload an OPML file.', async () => {
      await page.goto('/settings?tab=opml');
      await page.getByTestId('settings-opml-import-input').setInputFiles(SAMPLE_OPML_PATH);
    });

    await actionAndCapture(
      page,
      testInfo,
      'The OPML import rate-limit modal explains the hourly feed limit.',
      async () => {
        const dialog = page.getByRole('dialog', { name: 'OPML import limit reached' });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('You can add up to 50 feeds per hour');
        await expect(dialog).toContainText('30 minutes');
      },
      page.getByRole('dialog', { name: 'OPML import limit reached' })
    );
  });
});
