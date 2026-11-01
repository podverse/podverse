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
  LIVE_TITLE,
  removeAddByRSSNowPlayingFromQueues,
  stubAddByRSSParseStatusForRequest,
  TRACK_GUID,
  TRACK_TITLE,
} from './helpers/addByRSSArtist';
import {
  loginSeedUser,
  stubAddByRSSParse,
  stubAddByRSSParseAll,
  unfollowFeedOnServer,
} from './helpers/addByRSSCredentials';
import {
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_ALBUM_TITLE,
  E2E_MUSIC_CHANNEL_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const chipButton = (page: Page, name: string) =>
  page.getByTestId('media-list-chips').getByRole('button', { name, exact: true });

const trackTitleHeading = (page: Page) =>
  page.getByRole('heading', { name: TRACK_TITLE, exact: true });

test.describe('Add by RSS artist albums', () => {
  test.afterEach(async ({ page }) => {
    await removeAddByRSSNowPlayingFromQueues(page, TRACK_GUID);
    await unfollowFeedOnServer(page, ARTIST_FEED_URL);
    await unfollowFeedOnServer(page, ALBUM_FEED_URL);
  });

  test('When a member adds an Add by RSS artist, its listed albums show on its page, play with the artist named, and appear on the directory artist page the album names.', async ({
    page,
  }, testInfo) => {
    // One test walks add, two stubbed parses, and six page loads because the browser store is per
    // test. Same budget as add-by-rss-auto-parse.spec.ts.
    test.setTimeout(60_000);

    await loginSeedUser(page);
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
    let albumPath = '';

    await test.step('Adding the artist feed opens the Add by RSS artist page', async () => {
      await page.goto('/add-by-rss/add');
      await page.getByRole('textbox', { name: 'RSS Feed URL' }).fill(ARTIST_FEED_URL);
      await page.getByRole('button', { name: 'Add Feed', exact: true }).click();
      await expect(page).toHaveURL(/\/add-by-rss\/artist\/[^/]+$/, { timeout: 20_000 });
      artistPath = new URL(page.url()).pathname;

      const heading = page.getByRole('heading', { name: ARTIST_TITLE, level: 1 });
      await expect(heading).toBeVisible();
      const chrome = page.locator('[data-appearance="web"]');
      await expect(chrome.getByRole('heading')).toHaveCount(0);
      // The listed albums are stored after the artist page opens; wait for them before reloading.
      await expect(page.getByRole('link', { name: ALBUM_TITLE })).toBeVisible({ timeout: 15_000 });

      await capturePageLoad(
        page,
        testInfo,
        'The Add by RSS artist page opens after its stubbed parse.',
        heading
      );
    });

    await test.step('The Albums tab lists the Add by RSS album and links the directory album', async () => {
      await page.goto(`${artistPath}?type=albums`);
      const albumLink = page.getByRole('link', { name: ALBUM_TITLE });
      // The album's poll lands after the page paints.
      await expect(albumLink).toBeVisible({ timeout: 15_000 });
      await expect(albumLink).toHaveAttribute('href', /^\/add-by-rss\/album\/[^/]+$/);
      // A listed album parses only while a page polls it, so wait for its status to clear.
      await expect(albumLink).not.toContainText(/Queued|Processing/, { timeout: 15_000 });

      const directoryAlbumLink = page
        .locator(`a[href="/album/${E2E_MUSIC_ALBUM_ID_TEXT}"]`)
        .filter({ hasText: E2E_MUSIC_ALBUM_TITLE });
      await expect(directoryAlbumLink).toBeVisible();
      albumPath = (await albumLink.getAttribute('href')) ?? '';
      expect(albumPath).not.toBe('');

      await captureVerifiedElement(
        page,
        testInfo,
        albumLink,
        'The artist page lists the Add by RSS album above the linked directory album.'
      );
    });

    await test.step('The library Albums and Livestreams chips leave out the listed album and its livestream', async () => {
      await page.goto('/add-by-rss?tab=albums');
      await expect(chipButton(page, 'Albums')).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.locator('a[href*="/add-by-rss/album/"]').filter({ hasText: ALBUM_TITLE })
      ).toHaveCount(0);

      await page.goto('/add-by-rss?tab=livestreams');
      await expect(chipButton(page, 'Livestreams')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByText(LIVE_TITLE)).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The library livestreams list does not include the listed album livestream.',
        chipButton(page, 'Livestreams')
      );
    });

    await test.step('The listed album opens with Subscribe, its track, and its livestream row', async () => {
      await page.goto(albumPath);
      const albumHeading = page.getByRole('heading', { name: ALBUM_TITLE, level: 1 });
      await expect(albumHeading).toBeVisible();
      await expect(page.getByRole('button', { name: 'Subscribe', exact: true })).toBeVisible();
      await expect(trackTitleHeading(page)).toBeVisible();
      const liveRow = page.getByTestId('add-by-rss-livestream-row').filter({ hasText: LIVE_TITLE });
      await expect(liveRow).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The listed album shows Subscribe, its livestream row, and its track.',
        albumHeading
      );
    });

    await test.step('The listed album Settings tab offers Check Feed for Updates and the username and password section', async () => {
      await page.goto(`${albumPath}?type=settings`);
      const checkForUpdates = page.getByRole('button', {
        name: 'Check Feed for Updates',
        exact: true,
      });
      await expect(checkForUpdates).toBeVisible();
      const credentialsHeading = page.getByRole('heading', {
        name: 'Feed Username and Password',
        exact: true,
      });
      await expect(credentialsHeading).toBeVisible();

      await captureVerifiedElement(
        page,
        testInfo,
        credentialsHeading,
        'Settings on the listed album has Check Feed for Updates and the credentials section.'
      );
    });

    await test.step('The listed livestream opens its livestream page', async () => {
      await page.goto(albumPath);
      await page
        .getByTestId('add-by-rss-livestream-row')
        .filter({ hasText: LIVE_TITLE })
        .getByRole('heading', { name: LIVE_TITLE, exact: true })
        .click();
      await expect(page).toHaveURL(/\/add-by-rss\/music\/livestream\/[^/]+$/);
      const liveHeading = page.getByRole('heading', { name: LIVE_TITLE, exact: true });
      await expect(liveHeading).toBeVisible();
      await expect(page.getByText('This feed could not be found locally.')).toHaveCount(0);

      await capturePageLoad(
        page,
        testInfo,
        'The listed livestream page opens before the album is followed.',
        liveHeading
      );
    });

    await test.step('Playing the track names the Add by RSS artist in the player bar and the full-size player', async () => {
      await page.goto(albumPath);
      await expect(trackTitleHeading(page)).toBeVisible();
      // The track row's play control is the button that holds its title.
      await page
        .getByRole('button')
        .filter({ has: trackTitleHeading(page) })
        .click();

      await expect(
        page
          .locator('#media-player')
          .getByText(`${ARTIST_TITLE} · ${ALBUM_TITLE}`, { exact: true })
          .first()
      ).toBeVisible();

      await page.locator('#media-player').getByRole('button').first().click();
      const dialog = page.getByRole('dialog', { name: 'Fullscreen Media Player' });
      await expect(dialog).toBeVisible();
      const artistLink = dialog.getByRole('link', { name: ARTIST_TITLE, exact: true });
      await expect(artistLink).toBeVisible();

      await captureVerifiedElement(
        page,
        testInfo,
        artistLink,
        'The full-size player names the Add by RSS artist above the album.'
      );

      await artistLink.click();
      await expect(page).toHaveURL((url) => url.pathname === artistPath);
      await expect(dialog).toHaveCount(0);
    });

    await test.step('The track page links the Add by RSS artist in its byline', async () => {
      await page.goto(albumPath);
      const trackRow = page
        .locator('div')
        .filter({ has: trackTitleHeading(page) })
        .filter({ has: page.getByRole('button', { name: 'More Options' }) })
        .last();
      await trackRow.getByRole('button', { name: 'More Options' }).click();
      await page.getByRole('menuitem', { name: 'Go to Track', exact: true }).click();
      await expect(page).toHaveURL(/\/add-by-rss\/track\/[^/]+$/);
      await expect(trackTitleHeading(page)).toBeVisible();

      const bylineLink = page.getByRole('link', { name: ARTIST_TITLE, exact: true });
      await expect(bylineLink).toBeVisible();
      await expect(bylineLink).toHaveAttribute('href', artistPath);

      await captureVerifiedElement(
        page,
        testInfo,
        bylineLink,
        'The Add by RSS track page links the artist under the track title.'
      );
    });

    await test.step('The directory artist the album names shows it under Your Add by RSS Albums and its track under Tracks', async () => {
      await page.goto(`/artist/${E2E_MUSIC_CHANNEL_ID_TEXT}`);
      const yourAlbums = page.getByTestId('artist-your-add-by-rss-albums');
      // The section reads this browser's store after the server-rendered page paints.
      await expect(
        yourAlbums.getByRole('heading', { name: 'Your Add by RSS Albums', exact: true })
      ).toBeVisible({ timeout: 15_000 });
      await expect(yourAlbums.getByRole('link', { name: ALBUM_TITLE })).toBeVisible();
      await expect(yourAlbums.getByTestId('add-by-rss-row-marker')).toHaveAccessibleName(
        'Add by RSS'
      );

      await captureVerifiedElement(
        page,
        testInfo,
        yourAlbums,
        'The directory artist page lists the Add by RSS album with its marker.'
      );

      await page.getByRole('button', { name: 'Tracks', exact: true }).click();
      const yourTracks = page.getByTestId('artist-your-add-by-rss-tracks');
      // The marker sits inside the title heading, so the title match is not exact.
      await expect(yourTracks.getByRole('heading', { name: TRACK_TITLE })).toBeVisible();
      await expect(yourTracks.getByTestId('add-by-rss-row-marker')).toHaveCount(1);

      await captureVerifiedElement(
        page,
        testInfo,
        yourTracks,
        'The Tracks chip lists the Add by RSS track with its marker.'
      );
    });
  });
});
