import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { ChannelSeenMarkResponse } from '@podverse/helpers';

import {
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_CHANNEL_TITLE,
  E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const CHANNEL_URL = `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`;
const SUBSCRIBED_PODCASTS_URL = '/?sort=a_z';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

/**
 * Serve mark responses so the first open freezes an old previous last-seen (every seed episode
 * looks new) and a later reopen freezes "now" (nothing looks new).
 */
async function mockMarkPreviousLastSeen(page: Page): Promise<{ markCount: () => number }> {
  let markCount = 0;
  await page.route(
    (url) => url.pathname.endsWith('/account/channel-seen/mark'),
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      markCount += 1;
      const nowIso = new Date().toISOString();
      const previous = markCount === 1 ? '2020-01-01T00:00:00.000Z' : nowIso;
      const body: ChannelSeenMarkResponse = {
        data: [
          {
            channel_id_text: E2E_PODCAST_CHANNEL_ID_TEXT,
            has_more_unseen: false,
            last_seen_at: nowIso,
            previous_last_seen_at: previous,
            unseen_count: 0,
          },
        ],
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
  );
  return { markCount: () => markCount };
}

const episodeUnseenDot = (page: Page, itemIdText: string) =>
  page.getByTestId(`episode-row-unseen-${itemIdText}`);

test.describe('Podcast episode unseen dots', () => {
  test('When a signed-in listener opens a podcast, episode dots follow play, detail, and leave-and-return.', async ({
    page,
  }, testInfo) => {
    await loginSeedUser(page);
    const mark = await mockMarkPreviousLastSeen(page);

    await test.step('Opening the channel freezes the previous last-seen so newer episodes show a dot', async () => {
      await page.goto(CHANNEL_URL);
      await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();
      await expect.poll(() => mark.markCount()).toBe(1);

      await expect(episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT)).toBeVisible();
      await expect(episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT)).toBeVisible();

      await captureVerifiedElement(
        page,
        testInfo,
        episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT),
        'Channel episode rows show unseen dots from the previous last-seen.'
      );
    });

    await test.step('Opening one episode clears only that row’s dot when returning to the list', async () => {
      await page
        .locator(`a[href="/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}"]`)
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`));
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      await page
        .locator(`a[href="${CHANNEL_URL}"]`)
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));
      await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();
      await expect.poll(() => mark.markCount()).toBe(1);

      await expect(episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT)).toHaveCount(0);
      await expect(episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT)).toBeVisible();

      await captureVerifiedElement(
        page,
        testInfo,
        episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT),
        'The opened episode lost its dot; a sibling still has one.'
      );
    });

    await test.step('Leaving for the subscription list and reopening clears every remaining dot', async () => {
      await page.goto(SUBSCRIBED_PODCASTS_URL);
      await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();

      await page.goto(CHANNEL_URL);
      await expect(page.getByText(E2E_PODCAST_CHANNEL_TITLE).first()).toBeVisible();
      await expect.poll(() => mark.markCount()).toBe(2);

      await expect(episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT)).toHaveCount(0);
      await expect(episodeUnseenDot(page, E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT)).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'A fresh channel visit after leaving shows no episode dots.'
      );
    });
  });
});
