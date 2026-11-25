import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  buildAlbumPath,
  buildArtistPath,
  buildChapterPath,
  buildClipPath,
  buildEpisodePath,
  buildOfficialClipPath,
  buildPlaylistPath,
  buildPodcastLivestreamPath,
  buildPodcastPath,
  buildProfilePath,
  buildTrackPath,
} from '@podverse/helpers';

import {
  E2E_CATALOG_OFF_LIST_BOOST_CHANNEL_ID_TEXT,
  E2E_CATALOG_OFF_LIST_BOOST_EPISODE_ID_TEXT,
  E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT,
} from './helpers/catalogRestricted';
import { loginE2eUser } from './helpers/customThemes';
import { expectEmbedListShell, expectEmbedSingleShell } from './helpers/embedAssertions';
import {
  E2E_CLIP_ID_TEXT,
  E2E_EMBED_PLAYLIST_ID_TEXT,
  E2E_ITEM_CHAPTER_INTRO_ID_TEXT,
  E2E_LIVESTREAM_ITEM_ID_TEXT,
  E2E_LIVESTREAM_ITEM_TITLE,
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_ALBUM_TITLE,
  E2E_MUSIC_CHANNEL_ID_TEXT,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_CHANNEL_TITLE,
  E2E_SEO_PUBLIC_PROFILE_ID_TEXT,
  E2E_SOUNDBITE_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_ID_TEXT,
  EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
  EMBED_SAMPLE_PODCAST_CHANNEL_TITLE,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const NOT_FOUND_TEXT = 'This page could not be found.';

async function expectStoredPageOpens(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByText(NOT_FOUND_TEXT, { exact: true })).toHaveCount(0);
}

test.describe('Catalog-restricted stored content', () => {
  test('When the allowlist is set, stored shows off the list still open with their episodes.', async ({
    page,
  }, testInfo) => {
    await expectStoredPageOpens(
      page,
      buildPodcastPath(E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT)
    );
    const showHeading = page
      .getByRole('heading', { name: EMBED_SAMPLE_PODCAST_CHANNEL_TITLE, exact: true })
      .filter({ visible: true });
    await expect(showHeading).toBeVisible();

    await expectStoredPageOpens(
      page,
      buildEpisodePath(EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT)
    );
    await expectStoredPageOpens(page, buildPodcastPath(E2E_CATALOG_OFF_LIST_BOOST_CHANNEL_ID_TEXT));
    await expectStoredPageOpens(page, buildEpisodePath(E2E_CATALOG_OFF_LIST_BOOST_EPISODE_ID_TEXT));

    await capturePageLoad(
      page,
      testInfo,
      'A stored show off the allowlist opens with its episode.'
    );
  });

  test('When the allowlist is set, a clip, an official clip, and a chapter of a stored show off the list still open.', async ({
    page,
  }, testInfo) => {
    await expectStoredPageOpens(page, buildClipPath(EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT));
    await expectStoredPageOpens(page, buildOfficialClipPath(EMBED_FIXTURE_SOUNDBITE_ID_TEXT));
    await expectStoredPageOpens(page, buildChapterPath(EMBED_FIXTURE_CHAPTER_ID_TEXT));

    await capturePageLoad(page, testInfo, 'A chapter of a stored show off the allowlist opens.');
  });

  test('When the allowlist is set, single embeds of a stored show off the list still load.', async ({
    page,
  }, testInfo) => {
    const singleEmbedPaths = [
      `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`,
      `/embed/clip/${EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT}`,
      `/embed/official-clip/${EMBED_FIXTURE_SOUNDBITE_ID_TEXT}`,
      `/embed/chapter/${EMBED_FIXTURE_CHAPTER_ID_TEXT}`,
    ];
    for (const path of singleEmbedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expectEmbedSingleShell(page);
    }

    const singleShell = page.getByTestId('embed-single-shell');
    await capturePageLoad(
      page,
      testInfo,
      'A chapter embed of a stored show off the allowlist loads the single shell.',
      singleShell
    );
  });

  test('When the allowlist is set, list embeds of a stored show off the list and a public playlist embed still load.', async ({
    page,
  }, testInfo) => {
    const listEmbedPaths = [
      `/embed/podcast/${E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT}`,
      `/embed/episode-chapters/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`,
      `/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`,
    ];
    for (const path of listEmbedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expectEmbedListShell(page);
    }

    const listShell = page.getByTestId('embed-list-shell');
    await capturePageLoad(
      page,
      testInfo,
      'A public playlist embed still loads the list shell.',
      listShell
    );
  });

  test('Clips, official clips, and chapters of an allowlisted show open.', async ({
    page,
  }, testInfo) => {
    await expectStoredPageOpens(page, buildPodcastPath(E2E_PODCAST_CHANNEL_ID_TEXT));
    const showHeading = page
      .getByRole('heading', { name: E2E_PODCAST_CHANNEL_TITLE, exact: true })
      .filter({ visible: true });
    await expect(showHeading).toBeVisible();

    await expectStoredPageOpens(page, buildClipPath(E2E_CLIP_ID_TEXT));
    await expectStoredPageOpens(page, buildOfficialClipPath(E2E_SOUNDBITE_ID_TEXT));
    await expectStoredPageOpens(page, buildChapterPath(E2E_ITEM_CHAPTER_INTRO_ID_TEXT));

    await capturePageLoad(page, testInfo, 'A chapter of an allowlisted show opens.');
  });

  test('A podcast livestream of an allowlisted show opens.', async ({ page }, testInfo) => {
    await expectStoredPageOpens(page, buildPodcastLivestreamPath(E2E_LIVESTREAM_ITEM_ID_TEXT));
    const livestreamTitle = page.getByText(E2E_LIVESTREAM_ITEM_TITLE).first();
    await expect(livestreamTitle).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'A podcast livestream of an allowlisted show opens.',
      livestreamTitle
    );
  });

  test('When Music is off, stored album, artist, and track pages still open, and a podcast-style track URL still behaves as it does today.', async ({
    page,
  }, testInfo) => {
    await expectStoredPageOpens(page, buildAlbumPath(E2E_MUSIC_ALBUM_ID_TEXT));
    const albumTitle = page.getByText(E2E_MUSIC_ALBUM_TITLE).first();
    await expect(albumTitle).toBeVisible();

    await expectStoredPageOpens(page, buildArtistPath(E2E_MUSIC_CHANNEL_ID_TEXT));
    await expectStoredPageOpens(page, buildTrackPath(E2E_MUSIC_TRACK_ONE_ID_TEXT));

    await page.goto(buildEpisodePath(E2E_MUSIC_TRACK_ONE_ID_TEXT));
    await expect(page.getByText(NOT_FOUND_TEXT, { exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'A podcast-style track URL does not show the not-found page when Music is off.'
    );
  });

  test('When Music is off, stored album and track embeds still load.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/embed/album/${EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/embed/album/${EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT}$`));
    await expectEmbedListShell(page);

    await page.goto(`/embed/track/${EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT}`);
    await expect(page).toHaveURL(
      new RegExp(`/embed/track/${EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT}$`)
    );
    await expectEmbedSingleShell(page);

    const singleShell = page.getByTestId('embed-single-shell');
    await capturePageLoad(
      page,
      testInfo,
      'A stored track embed still loads the single shell when Music is off.',
      singleShell
    );
  });

  test('When the allowlist is set, a public playlist and a public profile still load, and a playlist row for a stored show off the list opens its episode.', async ({
    page,
  }, testInfo) => {
    const episodePath = buildEpisodePath(EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT);
    await expectStoredPageOpens(page, buildPlaylistPath(E2E_EMBED_PLAYLIST_ID_TEXT));
    const episodeLink = page.locator(`a[href="${episodePath}"]`).first();
    await expect(episodeLink).toBeVisible();
    await episodeLink.click();
    await expect(page).toHaveURL(new RegExp(`${episodePath}$`));
    await expect(page.getByText(NOT_FOUND_TEXT, { exact: true })).toHaveCount(0);

    const profilePath = buildProfilePath(E2E_SEO_PUBLIC_PROFILE_ID_TEXT);
    await expectStoredPageOpens(page, profilePath);

    await capturePageLoad(
      page,
      testInfo,
      'A public profile still loads when the allowlist is set.'
    );
  });

  test('When the allowlist is set, a signed-in listener still sees Subscribe on an allowlisted show and on a stored show off the list.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(20_000); // Sign-in plus two show pages.
    await loginE2eUser(page);

    await expectStoredPageOpens(page, buildPodcastPath(E2E_PODCAST_CHANNEL_ID_TEXT));
    await expect(
      page.getByRole('button', { name: /^(Subscribe|Unsubscribe)$/ }).first()
    ).toBeVisible();

    await expectStoredPageOpens(
      page,
      buildPodcastPath(E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT)
    );
    const subscribeButton = page.getByRole('button', { name: /^(Subscribe|Unsubscribe)$/ }).first();
    await expect(subscribeButton).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'A signed-in listener sees Subscribe on a stored show off the allowlist.',
      subscribeButton
    );
  });
});
