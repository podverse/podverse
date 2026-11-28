import { expect, test } from '@playwright/test';

import {
  followFeedOnServer,
  loginSeedUser,
  stubAddByRSSParse,
  stubAddByRSSParseAll,
  unfollowFeedOnServer,
} from './helpers/addByRSSCredentials';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const FEED_URL = 'https://e2e-seed-addbyrss.example/podcast-people.xml';
const FEED_TITLE = 'E2E Add by RSS People';
const HOST_NAME = 'Ada Host';
const GUEST_NAME = 'Grace Guest';

/** Partytime-shaped feed. Names stay on the device and do not link to a person page. */
const PARSED_FEED = {
  description: 'E2E people fixture',
  explicit: false,
  items: [
    {
      enclosure: {
        length: 0,
        type: 'audio/mpeg',
        url: 'https://e2e-seed-addbyrss.example/guest.mp3',
      },
      explicit: false,
      guid: 'e2e-people-guest-episode',
      podcastPeople: [{ name: GUEST_NAME }],
      pubDate: '2026-03-01T00:00:00.000Z',
      title: 'E2E Guest Episode',
    },
  ],
  link: 'https://e2e-seed-addbyrss.example/',
  podcastPeople: [{ name: HOST_NAME, role: 'host' }],
  title: FEED_TITLE,
};

test.describe('Add by RSS people', () => {
  test.afterEach(async ({ page }) => {
    await unfollowFeedOnServer(page, FEED_URL);
  });

  test('lists cast and an appearance without a person page link', async ({ page }, testInfo) => {
    // Login, opening the feed, and the parse poll match the other Add by RSS specs.
    test.setTimeout(60_000);
    await loginSeedUser(page);
    await followFeedOnServer(page, {
      feedUrl: FEED_URL,
      requiresCredentials: false,
      title: FEED_TITLE,
    });
    await stubAddByRSSParse(page, {
      feedUrl: FEED_URL,
      outcomes: [{ payload: PARSED_FEED, status: 'parsed' }],
    });
    await stubAddByRSSParseAll(page);

    await page.goto('/add-by-rss');
    const feedLink = page
      .locator('a[href*="/add-by-rss/podcast/"]')
      .filter({ hasText: FEED_TITLE })
      .first();
    await expect(feedLink).toBeVisible({ timeout: 10_000 });
    await feedLink.click();
    await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/]+$/);

    const peopleChip = page
      .getByTestId('add-by-rss-podcast-detail-chips')
      .getByRole('button', { exact: true, name: 'People' });
    await expect(peopleChip).toBeVisible({ timeout: 10_000 });
    await peopleChip.click();

    const people = page.getByTestId('add-by-rss-people');
    const castName = people.getByText(HOST_NAME, { exact: true });
    await expect(people.getByRole('heading', { name: 'Cast' })).toBeVisible();
    await expect(castName).toBeVisible();
    await expect(people.getByRole('heading', { name: 'Appearances' })).toBeVisible();
    await expect(people.getByText(GUEST_NAME, { exact: true })).toBeVisible();
    await expect(people.getByText('1 appearance', { exact: true })).toBeVisible();
    await expect(page.locator('a[href*="/person/"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: HOST_NAME })).toHaveCount(0);
    await expect(page.getByRole('link', { name: GUEST_NAME })).toHaveCount(0);

    await capturePageLoad(page, testInfo, 'Add by RSS People lists Cast and Appearances.', people);
    await captureVerifiedElement(
      page,
      testInfo,
      castName,
      'The cast name is plain text, with no link to a person page.'
    );
  });
});
