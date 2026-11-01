import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  ALBUM_FEED,
  ALBUM_FEED_URL,
  ALBUM_REQUEST_ID,
  ALBUM_TITLE,
  ARTIST_FEED,
  ARTIST_FEED_URL,
  ARTIST_LISTED_FEEDS,
  ARTIST_TITLE,
  stubAddByRSSParseStatusForRequest,
} from './helpers/addByRSSArtist';
import {
  loginSeedUser,
  stubAddByRSSParse,
  stubAddByRSSParseAll,
  unfollowFeedOnServer,
} from './helpers/addByRSSCredentials';
import { followChannelOnServer, unfollowChannelOnServer } from './helpers/channelFollows';
import {
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_ALBUM_TITLE,
  E2E_MUSIC_CHANNEL_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const DIRECTORY_ARTIST_TITLE = 'E2E Music Artist';

/** The header renders a desktop view and a tablet view. The visible control is first. */
const headerButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).first();

const dialog = (page: Page, artistTitle: string) =>
  page.getByRole('dialog', { name: `Unsubscribe from ${artistTitle}?` });

/** The first Subscribe on this browser asks before the follow is saved. */
const chooseInAppOnlyOnFirstSubscribe = async (page: Page): Promise<void> => {
  const pushPrompt = page.getByRole('dialog', { name: 'Enable Push Notifications?' });
  await expect(pushPrompt).toBeVisible();
  await pushPrompt.getByRole('button', { name: 'In-App Only', exact: true }).click();
  await expect(pushPrompt).toHaveCount(0);
};

const openDirectoryArtist = async (page: Page): Promise<void> => {
  await page.goto(`/artist/${E2E_MUSIC_CHANNEL_ID_TEXT}`);
  await expect(page).toHaveURL(new RegExp(`/artist/${E2E_MUSIC_CHANNEL_ID_TEXT}$`));
  await expect(page.getByRole('heading', { name: DIRECTORY_ARTIST_TITLE, level: 1 })).toBeVisible();
};

const openDirectoryAlbum = async (page: Page): Promise<void> => {
  await page.goto(`/album/${E2E_MUSIC_ALBUM_ID_TEXT}`);
  await expect(page).toHaveURL(new RegExp(`/album/${E2E_MUSIC_ALBUM_ID_TEXT}$`));
  await expect(page.getByRole('heading', { name: E2E_MUSIC_ALBUM_TITLE, level: 1 })).toBeVisible();
};

test.describe('Unsubscribe from an artist that has followed albums', () => {
  test.afterEach(async ({ page }) => {
    await unfollowChannelOnServer(page, E2E_MUSIC_CHANNEL_ID_TEXT);
    await unfollowChannelOnServer(page, E2E_MUSIC_ALBUM_ID_TEXT);
    await unfollowFeedOnServer(page, ARTIST_FEED_URL);
  });

  test('When a member who follows a directory artist and its verified album unsubscribes, the dialog asks about the album, and each choice does what it says.', async ({
    page,
  }, testInfo) => {
    await loginSeedUser(page);
    await followChannelOnServer(page, E2E_MUSIC_CHANNEL_ID_TEXT);
    await followChannelOnServer(page, E2E_MUSIC_ALBUM_ID_TEXT);

    await test.step('The dialog names the artist and the album count', async () => {
      await openDirectoryArtist(page);
      await headerButton(page, 'Unsubscribe').click();

      const unsubscribeDialog = dialog(page, DIRECTORY_ARTIST_TITLE);
      await expect(unsubscribeDialog).toBeVisible();
      await expect(unsubscribeDialog).toContainText('You also follow 1 album by this artist.');
      await expect(
        unsubscribeDialog.getByRole('button', { name: 'Cancel', exact: true })
      ).toBeVisible();
      await expect(
        unsubscribeDialog.getByRole('button', { name: 'Artist Only', exact: true })
      ).toBeVisible();
      await expect(
        unsubscribeDialog.getByRole('button', { name: 'Artist and Albums', exact: true })
      ).toBeVisible();

      await captureVerifiedElement(
        page,
        testInfo,
        unsubscribeDialog,
        'Unsubscribe from the directory artist asks about the one followed album.'
      );
    });

    await test.step('Cancel keeps both follows', async () => {
      await dialog(page, DIRECTORY_ARTIST_TITLE)
        .getByRole('button', { name: 'Cancel', exact: true })
        .click();
      await expect(dialog(page, DIRECTORY_ARTIST_TITLE)).toHaveCount(0);
      await expect(headerButton(page, 'Unsubscribe')).toBeVisible();
    });

    await test.step('Artist Only keeps the album', async () => {
      await headerButton(page, 'Unsubscribe').click();
      await dialog(page, DIRECTORY_ARTIST_TITLE)
        .getByRole('button', { name: 'Artist Only', exact: true })
        .click();
      await expect(headerButton(page, 'Subscribe')).toBeVisible();

      await openDirectoryAlbum(page);
      await expect(headerButton(page, 'Unsubscribe')).toBeVisible();
    });

    await test.step('Artist and Albums ends both follows', async () => {
      await openDirectoryArtist(page);
      await headerButton(page, 'Subscribe').click();
      await chooseInAppOnlyOnFirstSubscribe(page);
      await expect(headerButton(page, 'Unsubscribe')).toBeVisible();
      await headerButton(page, 'Unsubscribe').click();
      await dialog(page, DIRECTORY_ARTIST_TITLE)
        .getByRole('button', { name: 'Artist and Albums', exact: true })
        .click();
      await expect(headerButton(page, 'Subscribe')).toBeVisible();

      await openDirectoryAlbum(page);
      await expect(headerButton(page, 'Subscribe')).toBeVisible();
    });

    await test.step('No followed album, no dialog', async () => {
      await openDirectoryArtist(page);
      await headerButton(page, 'Subscribe').click();
      await expect(headerButton(page, 'Unsubscribe')).toBeVisible();
      await headerButton(page, 'Unsubscribe').click();
      await expect(headerButton(page, 'Subscribe')).toBeVisible();
      await expect(dialog(page, DIRECTORY_ARTIST_TITLE)).toHaveCount(0);
    });
  });

  test('When a member unsubscribes from an Add by RSS artist that lists a directory album they follow, the dialog counts that album only, and Artist and Albums ends both follows.', async ({
    page,
  }, testInfo) => {
    // One test walks add, a stubbed parse, and several page loads because the browser store is per
    // test. Same budget as add-by-rss-auto-parse.spec.ts.
    test.setTimeout(60_000);

    await loginSeedUser(page);
    await followChannelOnServer(page, E2E_MUSIC_ALBUM_ID_TEXT);
    await stubAddByRSSParse(page, {
      feedUrl: ARTIST_FEED_URL,
      outcomes: [
        { status: 'parsed', payload: ARTIST_FEED, publisherListedFeeds: ARTIST_LISTED_FEEDS },
      ],
    });
    await stubAddByRSSParseStatusForRequest(page, {
      requestId: ALBUM_REQUEST_ID,
      feedUrl: ALBUM_FEED_URL,
      outcome: { status: 'parsed', payload: ALBUM_FEED },
    });
    await stubAddByRSSParseAll(page);

    let artistPath = '';

    await test.step('Adding the artist feed opens the Add by RSS artist page', async () => {
      await page.goto('/add-by-rss/add');
      await page.getByRole('textbox', { name: 'RSS Feed URL' }).fill(ARTIST_FEED_URL);
      await page.getByRole('button', { name: 'Add Feed', exact: true }).click();
      await expect(page).toHaveURL(/\/add-by-rss\/artist\/[^/]+$/, { timeout: 20_000 });
      artistPath = new URL(page.url()).pathname;

      const heading = page.getByRole('heading', { name: ARTIST_TITLE, level: 1 });
      await expect(heading).toBeVisible();
      // The listed albums are stored after the artist page opens; wait for them before reloading.
      await expect(page.getByRole('link', { name: ALBUM_TITLE })).toBeVisible({ timeout: 15_000 });

      await capturePageLoad(
        page,
        testInfo,
        'The Add by RSS artist page opens after its stubbed parse.',
        heading
      );
    });

    await test.step('The artist lists both albums', async () => {
      await page.goto(`${artistPath}?type=albums`);
      await expect(page).toHaveURL(
        (url) => url.pathname === artistPath && url.searchParams.get('type') === 'albums'
      );
      const albumLink = page.getByRole('link', { name: ALBUM_TITLE });
      await expect(albumLink).toBeVisible({ timeout: 15_000 });
      const directoryAlbumLink = page.locator(`a[href="/album/${E2E_MUSIC_ALBUM_ID_TEXT}"]`);
      await expect(directoryAlbumLink).toBeVisible({ timeout: 15_000 });
    });

    await test.step('The dialog counts the followed album only', async () => {
      await headerButton(page, 'Unsubscribe').click();
      const unsubscribeDialog = dialog(page, ARTIST_TITLE);
      await expect(unsubscribeDialog).toBeVisible();
      await expect(unsubscribeDialog).toContainText('You also follow 1 album by this artist.');

      await captureVerifiedElement(
        page,
        testInfo,
        unsubscribeDialog,
        'Unsubscribe from the Add by RSS artist counts the one followed directory album.'
      );
    });

    await test.step('Artist and Albums ends both follows', async () => {
      await dialog(page, ARTIST_TITLE)
        .getByRole('button', { name: 'Artist and Albums', exact: true })
        .click();
      await expect(headerButton(page, 'Subscribe')).toBeVisible();

      await openDirectoryAlbum(page);
      await expect(headerButton(page, 'Subscribe')).toBeVisible();
    });
  });
});
