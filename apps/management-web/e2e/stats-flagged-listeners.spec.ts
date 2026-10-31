import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * E2E seed: superuser e2e-superadmin@example.com / Test!1Aa
 * (see tools/management-web/seed-e2e.mjs, make e2e_seed_management_web)
 */

const MOCK_ACTIVE_ROW = {
  id: 4343,
  listener_id: 'e2e0f1a2-0000-4000-8000-000000000001',
  reason: 'stored_cap_reached',
  flagged_at: '2026-10-21T12:00:00.000Z',
  times_flagged: 1,
  cleared_at: null,
  cleared_by_admin_id: null,
  listens_last_7_days: 300,
  opens_last_7_days: 4,
};

const CLEAR_CONFIRM_BODY =
  "This listener's new listening, and listening from before the flag, counts toward public lists again. Listening recorded while flagged stays out. A new signal on a later day flags it again.";

test.describe('Management-web flagged listeners page', () => {
  test('When a superuser opens Flagged Listeners from the stats page, they see the flagged listener and can clear its flag after confirming.', async ({
    page,
  }, testInfo) => {
    // Sign-in plus the stats page and this page exceeds the 10s default, same as the stats page spec.
    test.setTimeout(45_000);

    let cleared = false;
    let clearCalls = 0;

    // The page lives at /stats/flagged-listeners. Only the API path includes /api/v2.
    await page.route(/\/api\/v2\/stats\/flagged-listeners(?:\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const body = cleared
        ? { rows: [], total: 0, page: 1, pageSize: 25 }
        : { rows: [MOCK_ACTIVE_ROW], total: 1, page: 1, pageSize: 25 };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.route(/\/api\/v2\/stats\/flagged-listeners\/4343\/clear$/, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      clearCalls += 1;
      cleared = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          row: {
            ...MOCK_ACTIVE_ROW,
            cleared_at: '2026-10-22T09:00:00.000Z',
            cleared_by_admin_id: 1,
          },
        }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(ROUTES.STATS);
    await expect(page).toHaveURL(/\/stats$/);
    await page.getByRole('link', { name: 'Flagged Listeners' }).click();
    await expect(page).toHaveURL(/\/stats\/flagged-listeners$/);
    const heading = page.getByRole('heading', { name: 'Flagged Listeners', level: 1 });
    await expect(heading).toBeVisible();
    await capturePageLoad(page, testInfo, 'Flagged Listeners opens from the stats page.', heading);

    const row = page.getByRole('row', { name: /e2e0f1a2/ });
    await expect(row.getByText('Daily Listen Limit Reached Quickly')).toBeVisible();
    await expect(row.getByText('300', { exact: true })).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'The active row shows the listener, the daily listen limit reason, and 300 listens.',
      row
    );

    await page.getByRole('button', { name: 'Clear Flag for e2e0f1a2' }).click();
    const dialog = page.getByRole('dialog', { name: 'Clear Flag' });
    await expect(dialog.getByText(CLEAR_CONFIRM_BODY)).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'Clear Flag asks before the listener counts toward public lists again.',
      dialog
    );

    await dialog.getByRole('button', { name: 'Clear Flag', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(clearCalls).toBe(1);
    const empty = page.getByText('No flagged listeners match this status.');
    await expect(empty).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'After the flag is cleared, no listeners match the active status.',
      empty
    );
  });
});
