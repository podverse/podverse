import { expect, test } from '@playwright/test';

import { ROUTES } from '../src/constants/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

const mockNotification = {
  id: 901,
  account_id: 1,
  category: 'product-update',
  is_unread: false,
  title: 'Playlists just got faster',
  body: 'Large playlists now load without paging.',
  link_path: null,
  payload: null,
  created_at: '2026-08-23T10:00:00.000Z',
  expires_at: '2026-09-23T10:00:00.000Z',
} as const;

test.describe('Notifications inbox', () => {
  test('shows bell badge and clears after opening notifications page', async ({
    page,
  }, testInfo) => {
    let unreadCount = 2;

    await page.route('**/api/v1/account/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            unread_count: unreadCount,
          },
        }),
      });
    });

    await page.route('**/api/v1/account/notifications/mark-read', async (route) => {
      unreadCount = 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            last_read_at: '2026-08-23T11:00:00.000Z',
          },
        }),
      });
    });

    await page.route('**/api/v1/account/notifications*', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/unread-count') || url.pathname.endsWith('/mark-read')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [mockNotification],
            last_read_at: '2026-08-23T11:00:00.000Z',
            pagination: {
              page: 1,
              total_count: 1,
              total_pages: 1,
            },
            sections: {
              unread_count: 0,
            },
          },
        }),
      });
    });

    await page.goto(ROUTES.HOME);
    await page.locator('#email').fill('e2e-user@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(`**${ROUTES.DASHBOARD}`);

    await expect(page.getByRole('status', { name: '2 unread notifications' })).toBeVisible();

    await page.goto(ROUTES.NOTIFICATIONS);
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 3, name: mockNotification.title })
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Earlier' })).toBeVisible();

    // The inbox says what it is, so a purged notification reads as an old one aging out rather than
    // as something the app lost.
    await expect(
      page.getByText('Recent activity. Older notifications are cleared automatically.')
    ).toBeVisible();

    await expect(page.getByRole('status', { name: '2 unread notifications' })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Notifications inbox shows items and the unread bell badge clears after mark-read.',
      page.getByRole('heading', { level: 1, name: 'Notifications' })
    );
  });
});
