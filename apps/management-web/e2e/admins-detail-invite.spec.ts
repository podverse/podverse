import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

/**
 * Admins detail + invite controls are exercised with route mocks so table/detail stay deterministic.
 */

const MOCK_ADMIN_ROW = {
  id: 7001,
  id_text: 'e2e_admin_row',
  role: 'admin',
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

test.describe('Management-web admins detail and invite controls', () => {
  test('signed-in superuser can open admin detail and generate a password reset link', async ({
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
        body: JSON.stringify([MOCK_ADMIN_ROW]),
      });
    });

    await page.route(`**/api/v2/admins/${MOCK_ADMIN_ROW.id}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN_ROW),
      });
    });

    await page.route(`**/api/v2/admins/${MOCK_ADMIN_ROW.id}/invite-link`, async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ invite_link: null }),
        });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            invite_link: {
              url: 'https://example.com/admins/redeem-invite-link?token=e2e-token',
              expires_at: '2030-01-01T00:00:00.000Z',
              is_expired: false,
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(ROUTES.ADMINS);
    await expect(page.getByRole('heading', { name: 'Admins', level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'View' }).click();
    await expect(page).toHaveURL(new RegExp(`/admins/${MOCK_ADMIN_ROW.id}$`));
    await expect(page.getByRole('heading', { name: 'Admin detail', level: 1 })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The admin detail page loads from the admins list.',
      page.getByRole('heading', { name: 'Admin detail', level: 1 })
    );

    await page.getByRole('button', { name: 'Generate password reset link' }).click();
    const inviteLink = page.getByRole('link', {
      name: 'https://example.com/admins/redeem-invite-link?token=e2e-token',
    });
    await expect(inviteLink).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Generate password reset link shows the invite URL on admin detail.',
      inviteLink
    );
  });
});
