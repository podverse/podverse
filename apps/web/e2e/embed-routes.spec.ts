import { expect, test } from '@playwright/test';

import {
  EMBED_LIST_SHELL_HEIGHT,
  EMBED_LIST_SHELL_VIDEO_HEIGHT,
  EMBED_SINGLE_SHELL_HEIGHT,
  expectEmbedAudioPlayerMetadata,
  expectEmbedListActiveRowLabel,
  expectEmbedListRegionScrollable,
  expectEmbedListRowMetadata,
  expectEmbedListShell,
  expectEmbedNotAvailableShell,
  expectEmbedNotFoundShell,
  expectEmbedPlayerProgressVisible,
  expectEmbedRootVisible,
  expectEmbedShellHeightStable,
  expectEmbedSingleShell,
  expectEmbedTitleTruncated,
  expectEmbedVideoPlaceholder,
} from './helpers/embedAssertions';
import {
  E2E_CLIP_ID_TEXT,
  E2E_EMBED_ALBUM_LIST_DEFAULT_ITEM_ID_TEXT,
  E2E_EMBED_INVALID_PLAY_ID_TEXT,
  E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT,
  E2E_EMBED_PLAYLIST_ID_TEXT,
  E2E_EMBED_PLAYLIST_MIXED_ID_TEXT,
  E2E_EMBED_PODCAST_LIST_DEFAULT_ITEM_ID_TEXT,
  E2E_EMBED_PRIVATE_CHANNEL_ID_TEXT,
  E2E_EMBED_PRIVATE_PLAYLIST_ID_TEXT,
  E2E_EMBED_SCROLL_CHANNEL_ID_TEXT,
  E2E_EMBED_SCROLL_LAST_ITEM_LABEL,
  E2E_EMBED_VIDEO_CHANNEL_ID_TEXT,
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  E2E_ITEM_CHAPTER_INTRO_ID_TEXT,
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_MUSIC_TRACK_TWO_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  E2E_SOUNDBITE_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Embed routes (anonymous)', () => {
  test('Single embed routes render the audio shell or video placeholder', async ({ page }, testInfo) => {
    await test.step('Episode embed loads the single audio shell', async () => {
      await page.goto(`/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
      await expectEmbedRootVisible(page);
      await expectEmbedSingleShell(page);
      await expectEmbedAudioPlayerMetadata(page);
      await expectEmbedPlayerProgressVisible(page);
      await expectEmbedTitleTruncated(page);
      await expectEmbedShellHeightStable(page.getByTestId('embed-single-shell'), EMBED_SINGLE_SHELL_HEIGHT);

      await capturePageLoad(
        page,
        testInfo,
        'The episode embed shows the single audio shell.',
        page.getByTestId('embed-single-shell')
      );
    });

    await test.step('Track embed loads the single audio shell', async () => {
      await page.goto(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
      await expectEmbedSingleShell(page);
    });

    await test.step('Clip embed loads the single audio shell', async () => {
      await page.goto(`/embed/clip/${E2E_CLIP_ID_TEXT}`);
      await expectEmbedSingleShell(page);
    });

    await test.step('Chapter embed appends the chapter title suffix', async () => {
      await page.goto(`/embed/chapter/${E2E_ITEM_CHAPTER_INTRO_ID_TEXT}`);
      await expectEmbedSingleShell(page);
      await expect(page.getByTestId('embed-title')).toContainText(' — Intro');
    });

    await test.step('Official clip embed loads the single audio shell', async () => {
      await page.goto(`/embed/official-clip/${E2E_SOUNDBITE_ID_TEXT}`);
      await expectEmbedSingleShell(page);
    });

    await test.step('Video episode embed shows the video placeholder', async () => {
      await page.goto(`/embed/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}`);
      await expectEmbedSingleShell(page);
      await expectEmbedVideoPlaceholder(page);

      await capturePageLoad(
        page,
        testInfo,
        'The video episode embed shows the coming-soon placeholder.',
        page.getByTestId('embed-video-placeholder')
      );
    });
  });

  test('Single embed routes show not-found for invalid ids', async ({ page }) => {
    await page.goto(`/embed/episode/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);

    await page.goto(`/embed/track/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);

    await page.goto(`/embed/clip/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);

    await page.goto(`/embed/chapter/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);

    await page.goto(`/embed/official-clip/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);
  });

  test('Track embed accepts autoplay and start-time query params', async ({ page }) => {
    await page.goto(`/embed/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}?autoplay=true&t=10`);
    await expectEmbedSingleShell(page);
    expect(page.url()).toContain('autoplay=true');
    expect(page.url()).toContain('t=10');
  });

  test('Single embed accepts autoplay and start-time query params', async ({ page }) => {
    await page.goto(
      `/embed/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}?autoplay=true&t=42`
    );
    await expectEmbedSingleShell(page);
    expect(page.url()).toContain('autoplay=true');
    expect(page.url()).toContain('t=42');
  });

  test('List embed routes render list shells with default row selection', async ({ page }, testInfo) => {
    await test.step('Podcast list embed selects the newest episode by default', async () => {
      await page.goto(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, 'E2E Podcast Resume P > 0');
      await expectEmbedListRowMetadata(page);
      await expectEmbedPlayerProgressVisible(page);
      await expect(page.getByTestId('embed-title')).toContainText('E2E Podcast Resume P > 0');
      expect(E2E_EMBED_PODCAST_LIST_DEFAULT_ITEM_ID_TEXT).toBe(
        E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT
      );

      await capturePageLoad(
        page,
        testInfo,
        'The podcast list embed shows the default recent episode row as active.',
        page.getByTestId('embed-list-shell')
      );
    });

    await test.step('Album list embed selects the forward-sort default row', async () => {
      await page.goto(`/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, 'E2E Music Track Two');
      expect(E2E_EMBED_ALBUM_LIST_DEFAULT_ITEM_ID_TEXT).toBe(E2E_MUSIC_TRACK_TWO_ID_TEXT);
    });

    await test.step('Public playlist list embed loads rows', async () => {
      await page.goto(`/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, 'E2E Podcast Resume P > 0');
    });

    await test.step('Video channel list rows show the video placeholder when selected', async () => {
      await page.goto(`/embed/podcast/${E2E_EMBED_VIDEO_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedVideoPlaceholder(page);
    });

    await test.step('Mixed playlist exposes audio/video presentation style switching', async () => {
      await page.goto(`/embed/playlist/${E2E_EMBED_PLAYLIST_MIXED_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expect(page.getByTestId('embed-presentation-style-selector')).toBeVisible();
      await expectEmbedListActiveRowLabel(page, 'E2E Podcast Resume P > 0');
      await expectEmbedPlayerProgressVisible(page);
      await expectEmbedShellHeightStable(page.getByTestId('embed-list-shell'), EMBED_LIST_SHELL_HEIGHT);

      await page.getByRole('radio', { name: 'Video' }).check();
      await expectEmbedVideoPlaceholder(page);
      await expectEmbedShellHeightStable(
        page.getByTestId('embed-list-shell'),
        EMBED_LIST_SHELL_VIDEO_HEIGHT
      );

      await page.getByRole('radio', { name: 'Audio' }).check();
      await expectEmbedPlayerProgressVisible(page);
      await expect(page.getByTestId('embed-video-placeholder')).toHaveCount(0);
    });
  });

  test('List embed play_id_text override and fallback behave predictably', async ({ page }) => {
    await test.step('Valid play_id_text selects the matching row', async () => {
      await page.goto(
        `/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}?play_id_text=${E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, 'E2E Podcast Resume Near End');
    });

    await test.step('Invalid play_id_text falls back to the default row', async () => {
      await page.goto(
        `/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}?play_id_text=${E2E_EMBED_INVALID_PLAY_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, 'E2E Podcast Resume P > 0');
    });

    await test.step('Album list honors valid play_id_text override', async () => {
      await page.goto(
        `/embed/album/${E2E_MUSIC_ALBUM_ID_TEXT}?play_id_text=${E2E_MUSIC_TRACK_ONE_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, 'E2E Music Track One');
    });

    await test.step('Playlist invalid play_id_text falls back to the default row', async () => {
      await page.goto(
        `/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}?play_id_text=${E2E_EMBED_INVALID_PLAY_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, 'E2E Podcast Resume P > 0');
      expect(E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT).toBe(E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT);
    });
  });

  test('List embed shell uses fixed height and internal scrolling', async ({ page }, testInfo) => {
    await test.step('The podcast list shell is about 744px tall', async () => {
      await page.goto(`/embed/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedShellHeightStable(page.getByTestId('embed-list-shell'), EMBED_LIST_SHELL_HEIGHT);
    });

    await test.step('The scroll fixture channel list region scrolls when rows overflow', async () => {
      await page.goto(`/embed/podcast/${E2E_EMBED_SCROLL_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListRegionScrollable(page);

      const listRegion = page.getByTestId('embed-list-region');
      await listRegion.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });

      await expect(page.getByTestId('embed-list-row').filter({ hasText: E2E_EMBED_SCROLL_LAST_ITEM_LABEL })).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The embed list region scrolls to reveal rows below the fold.',
        listRegion
      );
    });
  });

  test('Private playlist embed renders the not-available shell', async ({ page }) => {
    await page.goto(`/embed/playlist/${E2E_EMBED_PRIVATE_PLAYLIST_ID_TEXT}`);
    await expectEmbedNotAvailableShell(page);
  });

  test('Private podcast channel embed renders the not-available shell', async ({ page }) => {
    await page.goto(`/embed/podcast/${E2E_EMBED_PRIVATE_CHANNEL_ID_TEXT}`);
    await expectEmbedNotAvailableShell(page);
  });

  test('List embed routes show not-found for invalid channel or playlist ids', async ({ page }) => {
    await page.goto(`/embed/podcast/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);

    await page.goto(`/embed/album/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);

    await page.goto(`/embed/playlist/${E2E_EMBED_INVALID_PLAY_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);
  });
});
