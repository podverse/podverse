import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { loginSeedUser, unfollowFeedOnServer } from './helpers/addByRSSCredentials';
import {
  E2E_ADD_BY_RSS_CHANNEL_TITLE,
  E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID,
  E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE,
  E2E_ARTIST_NOT_YET_ADDED_TRACK_TITLE,
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_ALBUM_TITLE,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const PODROLL_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast-podroll.xml';
const PODROLL_CHANNEL_TITLE = 'E2E Add-by-RSS Podroll Channel';
const PLAIN_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast-no-remote-items.xml';
const NOT_FOUND_FEED_GUID = 'e2e0a5f0-0000-4000-8000-0000000000f1';
const NOT_FOUND_FEED_URL = 'https://e2e-seed-addbyrss.example/remote-not-found.xml';
const NOT_FOUND_FEED_TITLE = 'E2E Remote Not Found Feed';
const NOT_FOUND_EPISODE_TITLE = 'E2E Remote Not Found Episode';
const TRACK_TITLE = 'E2E Music Track One';

const albumHref = `/album/${E2E_MUSIC_ALBUM_ID_TEXT}`;
const trackHref = `/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`;
const providerHref = `/podcast-index/feed/${E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID}`;

const chips = (page: Page) => page.getByTestId('add-by-rss-podcast-detail-chips');

const listRows = (page: Page) =>
  page.getByTestId('add-by-rss-remote-item-list').locator('a, button');

const addFeed = async (page: Page, feedUrl: string, headingName: string): Promise<Locator> => {
  await page.goto('/add-by-rss/add');
  await expect(page).toHaveURL(/\/add-by-rss\/add$/);
  await page.getByRole('textbox', { name: 'RSS Feed URL' }).fill(feedUrl);
  await page.getByRole('button', { name: 'Add Feed', exact: true }).click();
  // The fixture parse finishes after Add Feed; the default assertion budget is too short.
  await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/]+$/, { timeout: 20_000 });
  const heading = page.getByRole('heading', { name: headingName, level: 1 });
  await expect(heading).toBeVisible();
  return heading;
};

test.describe('Add by RSS podroll and remote items', () => {
  test.afterEach(async ({ page }) => {
    await unfollowFeedOnServer(page, PODROLL_FEED_URL);
    await unfollowFeedOnServer(page, PLAIN_FEED_URL);
  });

  test('When a member adds an Add by RSS feed that lists a podroll and remote items, each row opens the directory page, the Podcast Index page, or the Add by RSS remote feed page, and a resolve request sends only the remote feed keys.', async ({
    page,
  }, testInfo) => {
    // Add, lookup, and several page loads share one browser store, so the walk is longer than
    // the default test budget.
    test.setTimeout(60_000);
    await loginSeedUser(page);

    await test.step('Adding the podroll feed opens its podcast page with Podroll and Remote Items chips', async () => {
      await addFeed(page, PODROLL_FEED_URL, PODROLL_CHANNEL_TITLE);
      const podrollChip = chips(page).getByRole('button', { name: 'Podroll', exact: true });
      const remoteItemsChip = chips(page).getByRole('button', {
        name: 'Remote Items',
        exact: true,
      });
      await expect(podrollChip).toBeVisible();
      await expect(remoteItemsChip).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Add by RSS podcast page shows Podroll and Remote Items chips.',
        podrollChip
      );
    });

    await test.step('Podroll lists the album, the Podcast Index album, the unknown feed, and the track, in that order', async () => {
      const podrollChip = chips(page).getByRole('button', { name: 'Podroll', exact: true });
      await podrollChip.click();
      await expect(page).toHaveURL(/type=podroll/);
      await expect(podrollChip).toHaveAttribute('aria-pressed', 'true');

      const rows = listRows(page);
      await expect(rows).toHaveCount(4, { timeout: 10_000 });
      await expect(rows.nth(1)).toContainText(E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE, {
        timeout: 10_000,
      });
      await expect(rows.nth(0)).toContainText(E2E_MUSIC_ALBUM_TITLE);
      await expect(rows.nth(1)).toContainText(E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE);
      await expect(rows.nth(2)).toContainText(NOT_FOUND_FEED_TITLE);
      await expect(rows.nth(3)).toContainText(TRACK_TITLE);

      await capturePageLoad(
        page,
        testInfo,
        'Podroll lists the directory album, the Podcast Index album, the unknown feed, and the track.',
        rows.nth(0)
      );
    });

    await test.step('The directory album row opens the album page', async () => {
      const albumLink = listRows(page).nth(0);
      await expect(albumLink).toHaveAttribute('href', albumHref);
      await albumLink.click();
      await expect(page).toHaveURL(new RegExp(`${albumHref}$`));
      const heading = page.getByRole('heading', { name: E2E_MUSIC_ALBUM_TITLE, level: 1 });
      await expect(heading).toBeVisible();

      await capturePageLoad(page, testInfo, 'The directory album page shows its heading.', heading);

      await page.goBack();
      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/?]+/);
      await expect(page).toHaveURL(/type=podroll/);
      const channelHeading = page.getByRole('heading', { name: PODROLL_CHANNEL_TITLE, level: 1 });
      await expect(channelHeading).toBeVisible();
    });

    await test.step('The album the directory has not added opens its Podcast Index page', async () => {
      const providerLink = listRows(page).nth(1);
      await expect(providerLink).toHaveAttribute('href', providerHref);
      await providerLink.click();
      await expect(page).toHaveURL(new RegExp(`${providerHref}$`));
      const heading = page.getByRole('heading', { name: E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE });
      await expect(heading).toBeVisible();
      const addFeedButton = page.getByRole('button', { name: 'Add Feed', exact: true });
      await expect(addFeedButton).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Podcast Index page shows the album title and an Add Feed button.',
        addFeedButton
      );

      await page.goBack();
      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/?]+/);
      await expect(page).toHaveURL(/type=podroll/);
      await expect(
        page.getByRole('heading', { name: PODROLL_CHANNEL_TITLE, level: 1 })
      ).toBeVisible();
    });

    await test.step('The directory track row opens the track page and names its album', async () => {
      const trackLink = listRows(page).nth(3);
      await expect(trackLink).toHaveAttribute('href', trackHref);
      await expect(trackLink).toContainText(E2E_MUSIC_ALBUM_TITLE);
      await trackLink.click();
      await expect(page).toHaveURL(new RegExp(`${trackHref}$`));
      const heading = page.getByRole('heading', { name: TRACK_TITLE, level: 2 });
      await expect(heading).toBeVisible();

      await capturePageLoad(page, testInfo, 'The directory track page shows its heading.', heading);

      await page.goBack();
      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/?]+/);
      await expect(page).toHaveURL(/type=podroll/);
      await expect(
        page.getByRole('heading', { name: PODROLL_CHANNEL_TITLE, level: 1 })
      ).toBeVisible();
    });

    await test.step('The unknown feed opens the Add by RSS remote feed page with its title', async () => {
      const unknownFeed = listRows(page).nth(2);
      await expect(unknownFeed).toContainText(NOT_FOUND_FEED_TITLE);
      await unknownFeed.click();
      await expect(page).toHaveURL(/\/add-by-rss\/remote-feed\?/);
      const landed = new URL(page.url());
      expect(landed.searchParams.get('feed_url')).toBe(NOT_FOUND_FEED_URL);
      expect(landed.searchParams.get('title')).toBe(NOT_FOUND_FEED_TITLE);
      const heading = page.getByRole('heading', { name: NOT_FOUND_FEED_TITLE });
      await expect(heading).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The unknown feed opens the Add by RSS remote feed page with its title.',
        heading
      );

      await page.goBack();
      await expect(page).toHaveURL(/\/add-by-rss\/podcast\/[^/?]+/);
      await expect(page).toHaveURL(/type=podroll/);
      await expect(
        page.getByRole('heading', { name: PODROLL_CHANNEL_TITLE, level: 1 })
      ).toBeVisible();
    });

    await test.step('Remote Items lists the directory track, the Podcast Index track, and the unknown episode', async () => {
      const remoteItemsChip = chips(page).getByRole('button', {
        name: 'Remote Items',
        exact: true,
      });
      await remoteItemsChip.click();
      await expect(page).toHaveURL(/type=remote_items/);
      await expect(remoteItemsChip).toHaveAttribute('aria-pressed', 'true');

      const rows = listRows(page);
      await expect(rows).toHaveCount(3, { timeout: 10_000 });
      await expect(rows.nth(0)).toContainText(TRACK_TITLE);
      await expect(rows.nth(0)).toHaveAttribute('href', trackHref);
      await expect(rows.nth(1)).toContainText(E2E_ARTIST_NOT_YET_ADDED_TRACK_TITLE);
      await expect(rows.nth(1)).toHaveAttribute('href', providerHref, { timeout: 10_000 });
      await expect(rows.nth(2)).toContainText(NOT_FOUND_EPISODE_TITLE);

      await capturePageLoad(
        page,
        testInfo,
        'Remote Items lists the directory track, the Podcast Index track, and the unknown episode.',
        rows.nth(1)
      );
    });

    await test.step('The unknown episode resolve request sends only the remote feed guid and url, then opens the remote feed page without a title', async () => {
      const resolveRequest = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().includes('/account/add-by-rss/remote-item/resolve')
      );
      await listRows(page).nth(2).click();
      const request = await resolveRequest;
      expect(request.postDataJSON()).toEqual({
        feed_guid: NOT_FOUND_FEED_GUID,
        feed_url: NOT_FOUND_FEED_URL,
      });

      await expect(page).toHaveURL(/\/add-by-rss\/remote-feed\?/);
      const landed = new URL(page.url());
      expect(landed.searchParams.get('feed_url')).toBe(NOT_FOUND_FEED_URL);
      expect(landed.searchParams.has('title')).toBe(false);
      const heading = page.getByRole('heading', { name: NOT_FOUND_FEED_URL });
      await expect(heading).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The unknown episode opens the Add by RSS remote feed page with the feed URL and no title.',
        heading
      );
    });
  });

  test('When a member adds an Add by RSS feed with no remote references, the page shows neither the Podroll chip nor the Remote Items chip.', async ({
    page,
  }, testInfo) => {
    // The fixture parse finishes after Add Feed.
    test.setTimeout(45_000);
    await loginSeedUser(page);
    const heading = await addFeed(page, PLAIN_FEED_URL, E2E_ADD_BY_RSS_CHANNEL_TITLE);
    const chipRow = chips(page);
    await expect(chipRow.getByRole('button', { name: 'Podroll', exact: true })).toHaveCount(0);
    await expect(chipRow.getByRole('button', { name: 'Remote Items', exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'An Add by RSS feed with no remote references shows neither Podroll nor Remote Items.',
      heading
    );
  });
});
