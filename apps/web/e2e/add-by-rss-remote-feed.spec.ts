import { expect, test } from '@playwright/test';

import { buildAddByRSSRemoteFeedPath } from '../src/utils/addByRSS/remoteFeedPath';
import { loginSeedUser, unfollowFeedOnServer } from './helpers/addByRSSCredentials';
import { E2E_ADD_BY_RSS_CHANNEL_TITLE } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const FEED_URL = 'https://e2e-seed-addbyrss.example/remote-feed-page.xml';
const FEED_TITLE = 'E2E Remote Feed';
const EXPLANATION =
  'This feed is not in our directory or the Podcast Index. Add it by RSS to follow it in your Add by RSS library.';
const NOT_FOUND_TEXT = 'This page could not be found.';
const ERROR_BOUNDARY_TITLE = 'Something Went Wrong';

const remoteFeedPath = buildAddByRSSRemoteFeedPath({ feedUrl: FEED_URL, title: FEED_TITLE });

test.describe('Add by RSS remote feed', () => {
  test.afterEach(async ({ page }) => {
    await unfollowFeedOnServer(page, FEED_URL);
  });

  test('When a signed-in listener opens a remote feed the directory does not know, they can add it by RSS, and opening it again goes to that feed.', async ({
    page,
  }, testInfo) => {
    // Follow, parse, and a second navigation need longer than the default test budget.
    test.setTimeout(20_000);
    await loginSeedUser(page);

    await test.step('The page shows the reference title, the explanation, the feed URL, and an RSS Link', async () => {
      await page.goto(remoteFeedPath);
      await expect(page).toHaveURL(/\/add-by-rss\/remote-feed\?/);
      const landed = new URL(page.url());
      expect(landed.searchParams.get('feed_url')).toBe(FEED_URL);
      expect(landed.searchParams.get('title')).toBe(FEED_TITLE);

      const heading = page.getByRole('heading', { name: FEED_TITLE });
      await expect(heading).toBeVisible();
      await expect(page.getByText(EXPLANATION)).toBeVisible();
      await expect(page.getByText(FEED_URL)).toBeVisible();
      const rssLink = page.getByRole('link', { name: 'RSS Link' });
      await expect(rssLink).toBeVisible();
      await expect(rssLink).toHaveAttribute('href', FEED_URL);

      await capturePageLoad(
        page,
        testInfo,
        'The remote feed page shows the reference title, explanation, feed URL, and RSS Link.',
        heading
      );
    });

    let detailPath = '';
    await test.step('Pressing Add by RSS opens the parsed feed', async () => {
      await page.getByRole('button', { name: 'Add by RSS' }).click();
      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/?#]+$/);
      detailPath = new URL(page.url()).pathname;
      const channelHeading = page.getByRole('heading', { name: E2E_ADD_BY_RSS_CHANNEL_TITLE });
      await expect(channelHeading).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'After Add by RSS the parsed channel title is on the feed page.',
        channelHeading
      );
    });

    await test.step('Opening the same remote feed URL again goes to that feed page', async () => {
      await page.goto(remoteFeedPath);
      await expect(page).toHaveURL(new RegExp(`${detailPath}$`));
      const channelHeading = page.getByRole('heading', { name: E2E_ADD_BY_RSS_CHANNEL_TITLE });
      await expect(channelHeading).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'A later visit to the remote feed URL opens the feed that was already added.',
        channelHeading
      );
    });
  });

  test('When a signed-out visitor presses Add by RSS on a remote feed, the login modal opens.', async ({
    page,
  }, testInfo) => {
    await page.goto(remoteFeedPath);
    await expect(page).toHaveURL(/\/add-by-rss\/remote-feed\?/);
    await expect(page.getByRole('heading', { name: FEED_TITLE })).toBeVisible();

    await page.getByRole('button', { name: 'Add by RSS' }).click();
    const dialog = page.getByRole('dialog', { name: 'Login' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/add-by-rss\/remote-feed\?/);

    await capturePageLoad(
      page,
      testInfo,
      'Add by RSS while signed out opens the login modal on the remote feed page.',
      dialog
    );
  });

  test('When a visitor opens the remote feed page without a feed URL, they see the not-found page.', async ({
    page,
  }, testInfo) => {
    const response = await page.goto('/add-by-rss/remote-feed');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/add-by-rss\/remote-feed$/);
    const notFoundText = page.getByText(NOT_FOUND_TEXT, { exact: true });
    await expect(notFoundText).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TITLE)).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'A remote feed page with no feed URL shows the not-found page.',
      notFoundText
    );
  });

  test('When a visitor opens the remote feed page with a feed URL that is not a URL, they see the not-found page.', async ({
    page,
  }, testInfo) => {
    const response = await page.goto('/add-by-rss/remote-feed?feed_url=not-a-url');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/add-by-rss\/remote-feed\?feed_url=not-a-url$/);
    const notFoundText = page.getByText(NOT_FOUND_TEXT, { exact: true });
    await expect(notFoundText).toBeVisible();
    await expect(page.getByText(ERROR_BOUNDARY_TITLE)).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'A remote feed page with a feed URL that is not a URL shows the not-found page.',
      notFoundText
    );
  });
});
