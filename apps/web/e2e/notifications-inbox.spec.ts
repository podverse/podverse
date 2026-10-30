import type { Page, Request } from '@playwright/test';
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

const mockNotificationLine = `System update: ${mockNotification.title} – ${mockNotification.body}`;
const seenNotificationLine =
  'System update: Clips load faster – Large playlists now load without paging.';

const IDLE_NOTIFICATION_STREAM_BODY = 'retry: 600000\n\n';

function sseEvent(name: string, data: unknown, id?: number): string {
  return `${id !== undefined ? `id: ${id}\n` : ''}event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Serves `bodies[i]` to the i-th stream request; requests past the end get an idle body. */
async function mockNotificationStream(
  page: Page,
  bodies: Array<string | (() => Promise<string>)>
): Promise<{ requests: Request[] }> {
  const requests: Request[] = [];

  await page.route('**/api/v2/account/events*', async (route) => {
    const request = route.request();
    const origin = request.headers()['origin'] ?? '';

    // EventSource is credentialed and cross-origin. A reconnect sends Last-Event-ID, which the
    // browser preflights; answering OPTIONS lets that GET through so tests can read the header.
    if (request.method() === 'OPTIONS') {
      const allowHeaders =
        request.headers()['access-control-request-headers'] ?? 'cache-control, last-event-id';
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': allowHeaders,
          'access-control-allow-methods': 'GET',
        },
      });
      return;
    }

    requests.push(request);
    const bodySource = bodies[requests.length - 1];
    const body =
      bodySource === undefined
        ? IDLE_NOTIFICATION_STREAM_BODY
        : typeof bodySource === 'function'
          ? await bodySource()
          : bodySource;

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'cache-control': 'no-cache',
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
      },
      body,
    });
  });

  return { requests };
}

function createStreamGate(): { open: () => void; opened: Promise<void> } {
  let openGate = () => {};
  const opened = new Promise<void>((resolve) => {
    openGate = () => {
      resolve();
    };
  });
  return {
    open: () => {
      openGate();
    },
    opened,
  };
}

async function mockUnreadCount(page: Page, unreadCount: number): Promise<void> {
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
}

function notificationStateBody(unreadCount: number, retryMs: number): string {
  return (
    `retry: ${retryMs}\n\n` +
    sseEvent('notification.state', { unread_count: unreadCount, last_read_at: null })
  );
}

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
            items: [
              { ...mockNotification, is_unread: unreadCount > 0 },
              {
                ...mockNotification,
                id: 903,
                title: 'Clips load faster',
                created_at: '2026-08-22T10:00:00.000Z',
              },
            ],
            last_read_at: '2026-08-23T11:00:00.000Z',
            pagination: {
              page: 1,
              total_count: 2,
              total_pages: 1,
            },
            sections: {
              unread_count: 1,
            },
          },
        }),
      });
    });

    await mockNotificationStream(page, [notificationStateBody(2, 600000)]);

    await loginE2eUser(page);

    await page.goto('/');
    await expect(page.getByRole('status', { name: '2 unread notifications' })).toBeVisible();

    await page.goto(ROUTES.NOTIFICATIONS);
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    const rowHeading = page.getByRole('link', { name: mockNotificationLine });
    const seenRowHeading = page.getByRole('link', { name: seenNotificationLine });
    await expect(rowHeading).toBeVisible();
    await expect(seenRowHeading).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Unread' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Earlier' })).toHaveCount(0);
    await expect(
      page.getByText('Recent activity. Older notifications are cleared automatically.')
    ).toHaveCount(0);
    await expect(rowHeading.locator('[data-unread="true"]')).toBeVisible();
    await expect(seenRowHeading.locator('[data-unread="true"]')).toHaveCount(0);

    await expect(page.getByRole('status', { name: '2 unread notifications' })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Notifications inbox shows items and the unread bell badge clears after mark-read.',
      page.getByRole('heading', { level: 1, name: 'Notifications' })
    );

    await actionAndCapture(
      page,
      testInfo,
      'When the listener opens the inbox again, the notification they already saw has no unread indicator.',
      async () => {
        await page.goto(ROUTES.NOTIFICATIONS);
        await expect(page).toHaveURL(ROUTES.NOTIFICATIONS);
        await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
        await expect(rowHeading).toBeVisible();
        await expect(page.locator('[data-unread="true"]')).toHaveCount(0);
      },
      rowHeading
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

    await mockNotificationStream(page, [notificationStateBody(0, 600000)]);

    await loginE2eUser(page);
    await page.goto(ROUTES.NOTIFICATIONS);
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();

    const notificationLink = page.getByRole('link', {
      name: `New episode: ${episodeNotification.body} – ${episodeNotification.title}`,
    });
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

  test.describe('Live notification stream', () => {
    test('When a new notification arrives on the stream, the bell badge shows it without a reload.', async ({
      page,
    }, testInfo) => {
      await mockUnreadCount(page, 0);
      const arrivedNotification = {
        ...mockNotification,
        id: 950,
        is_unread: true,
      };
      const gate = createStreamGate();
      await mockNotificationStream(page, [
        notificationStateBody(0, 100),
        async () => {
          await gate.opened;
          return (
            'retry: 600000\n\n' +
            sseEvent(
              'notification.created',
              { notification: arrivedNotification, unread_count: 1 },
              950
            )
          );
        },
      ]);

      await loginE2eUser(page);
      await page.goto('/');
      await expect(page).toHaveURL(/\/$/);
      const bell = page
        .locator('[data-appearance="web"]')
        .getByRole('link', { name: 'Notifications' });
      await expect(bell).toBeVisible();
      await expect(page.getByRole('status', { name: '1 unread notifications' })).toHaveCount(0);

      const badge = page.getByRole('status', { name: '1 unread notifications' });
      await actionAndCapture(
        page,
        testInfo,
        'When a new notification arrives on the stream, the bell badge shows it without a reload.',
        async () => {
          gate.open();
          await expect(badge).toBeVisible();
        },
        badge
      );
    });

    test('When the notification is read on another device, the bell badge clears in every open tab.', async ({
      page,
    }, testInfo) => {
      await mockUnreadCount(page, 1);
      const gate = createStreamGate();
      const { requests } = await mockNotificationStream(page, [
        notificationStateBody(1, 100),
        async () => {
          await gate.opened;
          return (
            'retry: 600000\n\n' +
            sseEvent('notification.read', {
              scope: 'one',
              notification_id: 950,
              unread_count: 0,
            })
          );
        },
      ]);

      await loginE2eUser(page);
      await page.goto('/');
      await expect(page).toHaveURL(/\/$/);
      const bell = page
        .locator('[data-appearance="web"]')
        .getByRole('link', { name: 'Notifications' });
      await expect(bell).toBeVisible();
      await expect(page.getByRole('status', { name: '1 unread notifications' })).toBeVisible();

      const page2 = await page.context().newPage();
      await mockUnreadCount(page2, 1);
      await page2.goto('/');
      await expect(page2).toHaveURL(/\/$/);
      await expect(
        page2.locator('[data-appearance="web"]').getByRole('link', { name: 'Notifications' })
      ).toBeVisible();
      await expect(page2.getByRole('status', { name: '1 unread notifications' })).toBeVisible();

      await actionAndCapture(
        page,
        testInfo,
        'When the notification is read on another device, the bell badge clears in every open tab.',
        async () => {
          gate.open();
          await expect(page.getByRole('status', { name: '1 unread notifications' })).toHaveCount(0);
          await expect(page2.getByRole('status', { name: '1 unread notifications' })).toHaveCount(
            0
          );
        },
        bell
      );

      await expect.poll(() => requests.length).toBe(2);
    });

    test('When the stream reconnects after a new notification, it asks the server to replay from that notification.', async ({
      page,
    }, testInfo) => {
      await mockUnreadCount(page, 0);
      const createdNotification = {
        ...mockNotification,
        id: 951,
        is_unread: true,
      };
      const { requests } = await mockNotificationStream(page, [
        'retry: 100\n\n' +
          sseEvent(
            'notification.created',
            { notification: createdNotification, unread_count: 1 },
            951
          ),
        notificationStateBody(1, 600000),
      ]);

      await loginE2eUser(page);
      await page.goto('/');
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.locator('[data-appearance="web"]').getByRole('link', { name: 'Notifications' })
      ).toBeVisible();

      await expect.poll(() => requests.length).toBe(2);
      expect(requests[1]?.headers()['last-event-id']).toBe('951');

      const badge = page.getByRole('status', { name: '1 unread notifications' });
      await expect(badge).toBeVisible();
      await capturePageLoad(
        page,
        testInfo,
        'When the stream reconnects after a new notification, it asks the server to replay from that notification.',
        badge
      );
    });

    test('When a new notification arrives while the inbox is open, it appears at the top and is marked read.', async ({
      page,
    }, testInfo) => {
      let markReadOneCalls = 0;
      const arrivedNotification = {
        ...mockNotification,
        id: 960,
        is_unread: true,
        title: 'New episode just dropped',
        created_at: '2026-08-23T12:00:00.000Z',
      };

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
              items: [mockNotification],
              last_read_at: null,
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

      // Per-id mark-read is a different path from the list and Mark All as Read routes.
      await page.route('**/api/v2/account/notifications/960/mark-read', async (route) => {
        markReadOneCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              marked_ids: [960],
              unread_count: 0,
            },
          }),
        });
      });

      const gate = createStreamGate();
      await mockNotificationStream(page, [
        notificationStateBody(0, 100),
        async () => {
          await gate.opened;
          return (
            'retry: 600000\n\n' +
            sseEvent(
              'notification.created',
              { notification: arrivedNotification, unread_count: 1 },
              960
            )
          );
        },
      ]);

      await loginE2eUser(page);
      await page.goto(ROUTES.NOTIFICATIONS);
      await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
      const existingHeading = page.getByRole('link', { name: mockNotificationLine });
      await expect(existingHeading).toBeVisible();

      const newHeading = page.getByRole('link', {
        name: 'System update: New episode just dropped – Large playlists now load without paging.',
      });
      await actionAndCapture(
        page,
        testInfo,
        'When a new notification arrives while the inbox is open, it appears at the top and is marked read.',
        async () => {
          gate.open();
          await expect(newHeading).toBeVisible();
          await expect(newHeading.locator('[data-unread="true"]')).toBeVisible();
          expect(
            await newHeading.evaluate((heading, existingTitle) => {
              const rows = [...document.querySelectorAll('a')].filter((item) =>
                (item.textContent ?? '').includes('System update:')
              );
              const existingIndex = rows.findIndex((item) =>
                item.textContent?.includes(existingTitle)
              );
              const newIndex = rows.indexOf(heading);
              return existingIndex !== -1 && newIndex !== -1 && newIndex < existingIndex;
            }, mockNotification.title)
          ).toBe(true);
        },
        newHeading
      );

      await expect.poll(() => markReadOneCalls).toBe(1);
    });

    test('When the stream resyncs while the inbox is open, a notification that was unread keeps its indicator.', async ({
      page,
    }, testInfo) => {
      let listRequests = 0;

      await mockUnreadCount(page, 0);

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
        const isFirstList = listRequests === 0;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              items: [isFirstList ? { ...mockNotification, is_unread: true } : mockNotification],
              last_read_at: '2026-08-23T11:00:00.000Z',
              pagination: {
                page: 1,
                total_count: 1,
                total_pages: 1,
              },
              sections: {
                unread_count: isFirstList ? 1 : 0,
              },
            },
          }),
        });
        listRequests += 1;
      });

      const gate = createStreamGate();
      await mockNotificationStream(page, [
        notificationStateBody(1, 100),
        async () => {
          await gate.opened;
          return (
            'retry: 600000\n\n' + sseEvent('notification.resync', { reason: 'replay_limit' })
          );
        },
      ]);

      await loginE2eUser(page);
      await page.goto(ROUTES.NOTIFICATIONS);
      await expect(page).toHaveURL(ROUTES.NOTIFICATIONS);
      await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
      const rowHeading = page.getByRole('link', { name: mockNotificationLine });
      await expect(rowHeading).toBeVisible();
      await expect(rowHeading.locator('[data-unread="true"]')).toBeVisible();

      await actionAndCapture(
        page,
        testInfo,
        'When the stream resyncs while the inbox is open, a notification that was unread keeps its indicator.',
        async () => {
          gate.open();
          await expect.poll(() => listRequests).toBe(2);
          await expect(rowHeading.locator('[data-unread="true"]')).toBeVisible();
        },
        rowHeading
      );
    });
  });
});
