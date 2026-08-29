import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { ChannelSeenListResponse, ChannelSeenState } from '@podverse/helpers';
import { CHANNEL_SEEN_READ_PAGE_LIMIT } from '@podverse/helpers';

import { E2E_PODCAST_CHANNEL_ID_TEXT, E2E_PODCAST_CHANNEL_TITLE } from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const SUBSCRIBED_PODCASTS_URL = '/podcasts?type=subscribed&sort=a_z';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

/**
 * Serve the seen-state read from the test rather than the database.
 *
 * The count the API would return moves the moment any other spec opens the seeded channel while
 * signed in, because opening a channel is itself the write half of this feature. Fixing the read
 * here is what lets the three display rules — an exact count, a capped count, and no badge at all —
 * be asserted as three outcomes of the same row instead of one number that other specs can change.
 */
async function mockSeenState(page: Page, getState: () => ChannelSeenState): Promise<void> {
  await page.route(
    (url) => url.pathname.endsWith('/account/channel-seen'),
    async (route) => {
      const body: ChannelSeenListResponse = {
        data: [getState()],
        meta: { page: 1, count: 1, limit: CHANNEL_SEEN_READ_PAGE_LIMIT },
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
  );
}

const seededChannelRow = (page: Page) =>
  page.locator(`a[href*="${E2E_PODCAST_CHANNEL_ID_TEXT}"]`).first();

const unseenBadge = (page: Page, accessibleName: string) =>
  seededChannelRow(page).getByRole('img', { name: accessibleName });

test.describe('Subscribed podcasts unseen badges', () => {
  test('shows an exact count, a capped count, and nothing once caught up', async ({
    page,
  }, testInfo) => {
    let state: ChannelSeenState = {
      channel_id_text: E2E_PODCAST_CHANNEL_ID_TEXT,
      last_seen_at: '2026-08-01T00:00:00.000Z',
      unseen_count: 3,
      has_more_unseen: false,
    };

    await loginSeedUser(page);
    await mockSeenState(page, () => state);

    await test.step('An unseen count under the cap reads as the number itself', async () => {
      await page.goto(SUBSCRIBED_PODCASTS_URL);
      await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();

      const badge = unseenBadge(page, '3 new episodes');
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText('3');

      await captureVerifiedElement(
        page,
        testInfo,
        seededChannelRow(page),
        'Subscribed row badges three unseen episodes.'
      );
    });

    await test.step('An unseen count past the cap reads as 20+ and says so out loud', async () => {
      state = { ...state, unseen_count: 20, has_more_unseen: true };
      await page.goto(SUBSCRIBED_PODCASTS_URL);

      const badge = unseenBadge(page, 'More than 20 new episodes');
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText('20+');

      await captureVerifiedElement(
        page,
        testInfo,
        seededChannelRow(page),
        'Subscribed row caps the unseen count at 20+.'
      );
    });

    await test.step('Nothing unseen leaves the row unmarked rather than showing a zero', async () => {
      state = { ...state, unseen_count: 0, has_more_unseen: false };
      await page.goto(SUBSCRIBED_PODCASTS_URL);
      await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();

      await expect(page.getByRole('img', { name: /new episodes/ })).toHaveCount(0);

      await capturePageLoad(page, testInfo, 'Caught-up subscribed row carries no badge.');
    });
  });

  test('opening a channel marks it seen so other devices stop badging it', async ({
    page,
  }, testInfo) => {
    await loginSeedUser(page);

    const markRequest = page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        new URL(request.url()).pathname.endsWith('/account/channel-seen/mark')
    );

    await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();

    const request = await markRequest;
    expect(request.postDataJSON()).toEqual({
      entries: [{ channel_id_text: E2E_PODCAST_CHANNEL_ID_TEXT }],
    });

    await capturePageLoad(page, testInfo, 'Opening the channel page records it as seen.');
  });
});
