import { expect, test } from '@playwright/test';

import { APP_ROUTES } from '@podverse/helpers';

import { buildNotificationCampaignPath, ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

const mockCampaign = {
  id: 701,
  id_text: 'e2e-notif-camp-001',
  title: 'Maintenance tonight',
  body: 'Expected downtime at 00:00 UTC.',
  link_path: APP_ROUTES.SETTINGS,
  category: 'maintenance',
  audience: { type: 'all-valid-membership' },
  send_push: false,
  status: 'scheduled',
  scheduled_at: '2026-08-24T00:00:00.000Z',
  sent_at: null,
  cancelled_at: null,
  created_by_admin_id: 1,
  created_at: '2026-08-23T12:00:00.000Z',
  updated_at: '2026-08-23T12:00:00.000Z',
  last_error: null,
};

test.describe('Management-web admin notifications', () => {
  test('superuser can open notifications list and create a scheduled campaign', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/api/v2/notifications**', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [mockCampaign],
            pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
          }),
        });
        return;
      }
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockCampaign }),
        });
        return;
      }
      await route.continue();
    });

    await page.route(`**/api/v2/notifications/${mockCampaign.id_text}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockCampaign }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto(ROUTES.NOTIFICATIONS);
    await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Maintenance tonight' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Notifications list shows the scheduled campaign row.',
      page.getByRole('cell', { name: 'Maintenance tonight' })
    );

    await page.getByRole('link', { name: 'Create campaign' }).click();
    await page.locator('#notification-title').fill('Maintenance tonight');
    await page.locator('#notification-body').fill('Expected downtime at 00:00 UTC.');
    await page.locator('#notification-link-path').fill(APP_ROUTES.SETTINGS);
    await page.locator('#notification-send-at').fill('2026-08-24T00:00');
    await page.getByRole('button', { name: 'Create campaign' }).click();

    await page.waitForURL(`**${buildNotificationCampaignPath(mockCampaign.id_text)}`);
    await expect(
      page.getByRole('heading', { name: 'Notification campaign details' })
    ).toBeVisible();
  });
});
