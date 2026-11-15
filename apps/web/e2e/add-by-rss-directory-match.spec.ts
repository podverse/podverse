import { expect, test } from '@playwright/test';

import { buildPodcastPath } from '@podverse/helpers';

import { loginSeedUser, unfollowFeedOnServer } from './helpers/addByRSSCredentials';
import { unfollowChannelOnServer } from './helpers/channelFollows';
import {
  E2E_DIRECTORY_MATCH_CHANNEL_ID_TEXT,
  E2E_DIRECTORY_MATCH_CHANNEL_TITLE,
  E2E_DIRECTORY_MATCH_FEED_URL,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const podcastPath = buildPodcastPath(E2E_DIRECTORY_MATCH_CHANNEL_ID_TEXT);

test.describe('Add by RSS directory match', () => {
  test.afterEach(async ({ page }) => {
    await unfollowChannelOnServer(page, E2E_DIRECTORY_MATCH_CHANNEL_ID_TEXT);
    await unfollowFeedOnServer(page, E2E_DIRECTORY_MATCH_FEED_URL);
  });

  test('When a signed-in member adds an RSS URL Podverse already has, they land on that podcast page and are subscribed.', async ({
    page,
  }, testInfo) => {
    await loginSeedUser(page);

    await test.step('Adding the feed opens the directory podcast, subscribed', async () => {
      await page.goto('/add-by-rss/add');
      await expect(page).toHaveURL(/\/add-by-rss\/add$/);
      const feedUrl = page.getByRole('textbox', { name: 'RSS Feed URL' });
      await expect(feedUrl).toBeVisible();
      await feedUrl.fill(E2E_DIRECTORY_MATCH_FEED_URL);
      await page.getByRole('button', { name: 'Add Feed', exact: true }).click();

      await expect(page).toHaveURL((url) => url.pathname === podcastPath);
      const heading = page.getByRole('heading', { name: E2E_DIRECTORY_MATCH_CHANNEL_TITLE });
      await expect(heading).toBeVisible();
      await expect(page.getByRole('button', { name: 'Unsubscribe', exact: true })).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Adding a directory RSS URL opens the podcast page, subscribed.',
        heading
      );
    });
  });
});
