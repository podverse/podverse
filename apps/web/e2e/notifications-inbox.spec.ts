import { expect, test } from '@playwright/test';

import { buildEpisodePath } from '@podverse/helpers';

import { ROUTES } from '../src/constants/routes';
import { loginE2eUser } from './helpers/customThemes';
import {
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

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

    await page.route('**/api/v2/account/notifications/unread-count', async (route) => {
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

    await page.route('**/api/v2/account/notifications/mark-read', async (route) => {
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

    await page.route('**/api/v2/account/notifications*', async (route) => {
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

    await loginE2eUser(page);

    await page.goto('/');
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

  test('When a listener taps a new-episode notification, they land on that episode page.', async ({
    page,
  }, testInfo) => {
    const episodePath = buildEpisodePath(E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT);
    const episodeNotification = {
      id: 902,
      account_id: 1,
      category: 'new-content',
      is_unread: false,
      title: 'E2E Podcast No Stored Position',
      body: 'E2E Podcast Seed Channel',
      link_path: episodePath,
      payload: {
        channelIdText: E2E_PODCAST_CHANNEL_ID_TEXT,
        itemIdText: E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
        type: 'new-episode',
      },
      created_at: '2026-08-23T10:00:00.000Z',
      expires_at: '2026-09-23T10:00:00.000Z',
    } as const;

    await page.route('**/api/v2/account/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            unread_count: 0,
          },
        }),
      });
    });

    await page.route('**/api/v2/account/notifications/mark-read', async (route) => {
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

    await page.route('**/api/v2/account/notifications*', async (route) => {
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
            items: [episodeNotification],
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

    await loginE2eUser(page);
    await page.goto(ROUTES.NOTIFICATIONS);
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();

    const notificationLink = page.getByRole('link', { name: episodeNotification.title });
    await expect(notificationLink).toBeVisible();

    const episodeTitle = page.getByRole('heading', {
      level: 2,
      name: 'E2E Podcast No Stored Position',
    });
    await actionAndCapture(
      page,
      testInfo,
      'Tapping the inbox row opens the episode page so the listener can play it.',
      async () => {
        await notificationLink.click();
        await expect(page).toHaveURL(episodePath);
        await expect(episodeTitle).toBeVisible();
      },
      episodeTitle
    );
  });
});
