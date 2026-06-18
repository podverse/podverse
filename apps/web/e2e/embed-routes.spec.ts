import { expect, test } from '@playwright/test';

import {
  EMBED_LIST_SHELL_HEIGHT,
  EMBED_LIST_SHELL_HEIGHT_WITH_SELECTOR,
  EMBED_LIST_SHELL_RESPONSIVE_HEIGHT_WITH_SELECTOR,
  EMBED_SINGLE_SHELL_HEIGHT,
  embedTitleLocator,
  expectEmbedArtworkSrcContains,
  expectEmbedAudioPlayerMetadata,
  expectEmbedBrandLogoMainSiteLink,
  expectEmbedChapterMarkerCount,
  expectEmbedListActiveRowLabel,
  expectEmbedListActiveRowMetaContains,
  expectEmbedListRegionScrollable,
  expectEmbedListRowMetadata,
  expectEmbedListShell,
  expectEmbedNotAvailableShell,
  expectEmbedNotFoundShell,
  expectEmbedPlayerDuration,
  expectEmbedPlayerProgressVisible,
  expectEmbedResponsiveVideoElement,
  expectEmbedRootVisible,
  expectEmbedShellHeightStable,
  expectEmbedSingleShell,
  expectEmbedTitleTruncated,
  expectNoEmbedChapterMarkers,
  seekEmbedPlayerToSeconds,
} from './helpers/embedAssertions';
import {
  E2E_EMBED_ALBUM_LIST_DEFAULT_ITEM_ID_TEXT,
  E2E_EMBED_INVALID_PLAY_ID_TEXT,
  E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT,
  E2E_EMBED_PLAYLIST_ID_TEXT,
  E2E_EMBED_PLAYLIST_MIXED_ID_TEXT,
  E2E_EMBED_PODCAST_LIST_DEFAULT_ITEM_ID_TEXT,
  E2E_EMBED_PRIVATE_CHANNEL_ID_TEXT,
  E2E_EMBED_PRIVATE_PLAYLIST_ID_TEXT,
  E2E_EMBED_SCROLL_CHANNEL_ID_TEXT,
  E2E_EMBED_SCROLL_OLDEST_ITEM_LABEL,
  E2E_EMBED_VIDEO_CHANNEL_ID_TEXT,
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT,
  EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT,
  EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
  EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE,
  EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS,
  EMBED_SAMPLE_CLIP_TITLE,
  EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
  EMBED_SAMPLE_EPISODE_DURATION_DISPLAY,
  EMBED_SAMPLE_EPISODE_NEAR_END_TITLE,
  EMBED_SAMPLE_SOUNDBITE_TITLE,
  EMBED_SAMPLE_TRACK_AUDIO_TITLE,
  EMBED_SAMPLE_TRACK_TWO_TITLE,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Embed routes (anonymous)', () => {
  test('Single embed routes render audio and video player shells', async ({ page }, testInfo) => {
    await test.step('Episode embed loads the single audio shell', async () => {
      await page.goto(`/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`);
      await expectEmbedRootVisible(page);
      await expectEmbedSingleShell(page);
      await expectEmbedAudioPlayerMetadata(page);
      await expectEmbedBrandLogoMainSiteLink(
        page,
        `http://main.example.test/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`
      );
      await expectEmbedPlayerProgressVisible(page);
      await expectEmbedTitleTruncated(page);
      await expectEmbedShellHeightStable(
        page.getByTestId('embed-single-shell'),
        EMBED_SINGLE_SHELL_HEIGHT
      );

      await capturePageLoad(
        page,
        testInfo,
        'The episode embed shows the single audio shell.',
        page.getByTestId('embed-single-shell')
      );
    });

    await test.step('Episode embed alternate enclosure modal lists supported formats', async () => {
      await page.goto(`/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`);
      await expect(page.getByTestId('embed-player-alternate-enclosure-button')).toBeVisible();
      await expect(page.getByTestId('embed-player-more-button')).toBeVisible();
      await expect(page.getByTestId('embed-player-playback-speed-button')).toHaveCount(0);
      await page.getByTestId('embed-player-more-button').click();
      await expect(page.getByRole('menuitem', { name: 'Playback Speed: 1x' })).toBeVisible();
      await page.getByTestId('embed-player-alternate-enclosure-button').click();
      const modal = page.getByTestId('embed-alternate-enclosure-modal');
      await expect(modal).toBeVisible();
      const options = page.getByTestId('embed-alternate-enclosure-options');
      await expect(options.getByRole('button')).toHaveCount(4);
      await expect(
        options.getByTestId('embed-alternate-enclosure-option-audio-mpeg')
      ).toBeVisible();
      await expect(
        options.getByTestId('embed-alternate-enclosure-option-audio-mpeg')
      ).toContainText('localhost');
      await expect(options.getByTestId('embed-alternate-enclosure-option-audio-ogg')).toBeVisible();
      await expect(options.getByTestId('embed-alternate-enclosure-option-video-mp4')).toBeVisible();
      await expect(
        options.getByTestId('embed-alternate-enclosure-option-video-webm')
      ).toBeVisible();
      await options.getByTestId('embed-alternate-enclosure-option-audio-ogg').click();
      await expect(modal).toHaveCount(0);
    });

    await test.step('Episode embed alternate enclosure switch preserves the current playhead', async () => {
      await page.goto(`/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`);
      await expectEmbedPlayerProgressVisible(page);
      await page.getByTestId('embed-player-play-button-cell').getByRole('button').click();
      await seekEmbedPlayerToSeconds(page, 15);

      const slider = page.getByRole('slider');
      const positionBeforeSwitch = Number(await slider.getAttribute('aria-valuenow'));
      expect(positionBeforeSwitch).toBeGreaterThanOrEqual(13);

      await page.getByTestId('embed-player-alternate-enclosure-button').click();
      await page.getByTestId('embed-alternate-enclosure-option-audio-ogg').click();

      await expect
        .poll(async () => Number(await slider.getAttribute('aria-valuenow')))
        .toBeGreaterThanOrEqual(positionBeforeSwitch - 2);
    });

    await test.step('Track embed loads the single audio shell', async () => {
      await page.goto(`/embed/track/${EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT}`);
      await expectEmbedSingleShell(page);
    });

    await test.step('Clip embed loads the single audio shell with episode artwork', async () => {
      await page.goto(`/embed/clip/${EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT}`);
      await expectEmbedSingleShell(page);
      await expectEmbedArtworkSrcContains(page, 'e2e-embed-item-art');
    });

    await test.step('Chapter embed shows the second chapter title at the playhead', async () => {
      await page.goto(`/embed/chapter/${EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT}`);
      await expectEmbedSingleShell(page);
      await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE);
      await expect(page.getByTestId('embed-chapter-title-icon')).toBeVisible();
      await expectEmbedArtworkSrcContains(page, 'e2e-embed-item-art');
    });

    await test.step('Official clip embed loads the single audio shell with episode artwork', async () => {
      await page.goto(`/embed/official-clip/${EMBED_FIXTURE_SOUNDBITE_ID_TEXT}`);
      await expectEmbedSingleShell(page);
      await expectEmbedArtworkSrcContains(page, 'e2e-embed-item-art');
    });

    await test.step('Video episode embed shows the inline video stage and video element', async () => {
      await page.goto(`/embed/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}`);
      await expectEmbedSingleShell(page);
      await expectEmbedResponsiveVideoElement(page);

      await capturePageLoad(
        page,
        testInfo,
        'The video episode embed shows the inline responsive video stage.',
        page.getByTestId('embed-responsive-stage')
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

  test('Track embed accepts start-time query param', async ({ page }) => {
    await page.goto(`/embed/track/${EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT}?t=10`);
    await expectEmbedSingleShell(page);
    expect(page.url()).toContain('t=10');
  });

  test('Single embed accepts start-time query param', async ({ page }) => {
    await page.goto(`/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?t=42`);
    await expectEmbedSingleShell(page);
    expect(page.url()).toContain('t=42');
  });

  test('Episode embed shows chapter markers and time-based chapter titles', async ({ page }) => {
    const chapterTwoPlayheadSeconds = EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS + 6;
    await page.goto(
      `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?t=${chapterTwoPlayheadSeconds}`
    );
    await expectEmbedSingleShell(page);
    await expectEmbedChapterMarkerCount(page, 2);
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE);
    await expect(page.getByTestId('embed-chapter-title-icon')).toBeVisible();
    await expectEmbedArtworkSrcContains(page, 'e2e-embed-item-art');

    await page.getByTestId('embed-title-toggle').click();
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
    await expect(page.getByTestId('embed-chapter-title-icon')).toHaveCount(0);
    await expectEmbedArtworkSrcContains(page, 'e2e-embed-item-art');

    await page.getByTestId('embed-title-toggle').click();
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE);
    await expect(page.getByTestId('embed-chapter-title-icon')).toBeVisible();
    await expectEmbedArtworkSrcContains(page, 'e2e-embed-item-art');

    await page.getByTestId('embed-chapter-title-icon').click();
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
    await expect(page.getByTestId('embed-chapter-title-icon')).toHaveCount(0);

    await page.getByTestId('embed-channel-title').click();
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE);
    await expect(page.getByTestId('embed-chapter-title-icon')).toBeVisible();
  });

  test('Episode embed hides chapter markers when chapter_markers=0', async ({ page }) => {
    await page.goto(
      `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?chapter_markers=0`
    );
    await expectEmbedSingleShell(page);
    await expectNoEmbedChapterMarkers(page);
  });

  test('Chapter embed seeks to the chapter start before the first play', async ({ page }) => {
    await page.goto(`/embed/chapter/${EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT}`);
    await expectEmbedSingleShell(page);
    await expectEmbedPlayerProgressVisible(page);
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE);
    await expect(page.getByTestId('embed-chapter-title-icon')).toBeVisible();
    await expectEmbedArtworkSrcContains(page, 'e2e-embed-item-art');

    const slider = page.getByRole('slider');
    await expect
      .poll(async () => await slider.getAttribute('aria-valuenow'))
      .toBe(String(EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS));

    await page.getByTestId('embed-player-play-button-cell').getByRole('button').click();
    await expect
      .poll(async () => await slider.getAttribute('aria-valuenow'))
      .toBe(String(EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS));
  });

  test('Clip and soundbite embeds hide chapter info', async ({ page }) => {
    await page.goto(`/embed/clip/${EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT}?t=25`);
    await expectEmbedSingleShell(page);
    await expectNoEmbedChapterMarkers(page);
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CLIP_TITLE);
    await expect(page.getByTestId('embed-title-toggle')).toHaveCount(0);
    await expect(page.getByTestId('embed-chapter-title-icon')).toHaveCount(0);

    await page.goto(`/embed/official-clip/${EMBED_FIXTURE_SOUNDBITE_ID_TEXT}?t=15`);
    await expectEmbedSingleShell(page);
    await expectNoEmbedChapterMarkers(page);
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_SOUNDBITE_TITLE);
    await expect(page.getByTestId('embed-title-toggle')).toHaveCount(0);
    await expect(page.getByTestId('embed-chapter-title-icon')).toHaveCount(0);
  });

  test('Episode embed retains duration and chapter markers after playback ends', async ({
    page,
  }) => {
    await page.goto(`/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`);
    await expectEmbedSingleShell(page);
    await expectEmbedPlayerDuration(page, EMBED_SAMPLE_EPISODE_DURATION_DISPLAY);
    await expectEmbedChapterMarkerCount(page, 2);

    await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (audio === null || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        throw new Error('Embed audio element is not ready for ended simulation');
      }
      audio.currentTime = audio.duration;
      audio.dispatchEvent(new Event('ended'));
    });

    await expectEmbedPlayerDuration(page, EMBED_SAMPLE_EPISODE_DURATION_DISPLAY);
    await expectEmbedChapterMarkerCount(page, 2);
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  });

  test('List embed routes render list shells with default row selection', async ({
    page,
  }, testInfo) => {
    await test.step('Podcast list embed selects the newest episode by default', async () => {
      await page.goto(`/embed/podcast/${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
      await expectEmbedListRowMetadata(page);
      await expectEmbedPlayerProgressVisible(page);
      await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
      expect(E2E_EMBED_PODCAST_LIST_DEFAULT_ITEM_ID_TEXT).toBe(
        EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT
      );

      await capturePageLoad(
        page,
        testInfo,
        'The podcast list embed shows the default recent episode row as active.',
        page.getByTestId('embed-list-shell')
      );
    });

    await test.step('Album list embed selects the forward-sort default row', async () => {
      await page.goto(`/embed/album/${EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_TRACK_TWO_TITLE);
      expect(E2E_EMBED_ALBUM_LIST_DEFAULT_ITEM_ID_TEXT).toBe(EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT);
    });

    await test.step('Public playlist list embed loads rows', async () => {
      await page.goto(`/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
    });

    await test.step('Video channel list rows show the video stage when selected', async () => {
      await page.goto(`/embed/podcast/${E2E_EMBED_VIDEO_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedResponsiveVideoElement(page);
    });

    await test.step('Mixed playlist exposes audio/video presentation style switching', async () => {
      await page.goto(`/embed/playlist/${E2E_EMBED_PLAYLIST_MIXED_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expect(page.getByTestId('embed-presentation-style-selector')).toBeVisible();
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
      await expectEmbedPlayerProgressVisible(page);
      await expectEmbedShellHeightStable(
        page.getByTestId('embed-list-shell'),
        EMBED_LIST_SHELL_HEIGHT_WITH_SELECTOR
      );

      await page.getByRole('radio', { name: 'Video' }).check();
      await expectEmbedResponsiveVideoElement(page);
      await expectEmbedShellHeightStable(
        page.getByTestId('embed-list-shell'),
        EMBED_LIST_SHELL_RESPONSIVE_HEIGHT_WITH_SELECTOR
      );

      await page.getByRole('radio', { name: 'Audio' }).check();
      await expectEmbedPlayerProgressVisible(page);
      await expect(page.getByTestId('embed-responsive-stage')).toHaveCount(0);
    });
  });

  test('List embed play_id_text override and fallback behave predictably', async ({ page }) => {
    await test.step('Valid play_id_text selects the matching row', async () => {
      await page.goto(
        `/embed/podcast/${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}?play_id_text=${EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_EPISODE_NEAR_END_TITLE);
    });

    await test.step('Invalid play_id_text falls back to the default row', async () => {
      await page.goto(
        `/embed/podcast/${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}?play_id_text=${E2E_EMBED_INVALID_PLAY_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
    });

    await test.step('Album list honors valid play_id_text override', async () => {
      await page.goto(
        `/embed/album/${EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT}?play_id_text=${EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_TRACK_AUDIO_TITLE);
    });

    await test.step('Playlist invalid play_id_text falls back to the default row', async () => {
      await page.goto(
        `/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}?play_id_text=${E2E_EMBED_INVALID_PLAY_ID_TEXT}`
      );
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_EPISODE_AUDIO_TITLE);
      expect(E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT).toBe(
        EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT
      );
    });
  });

  test('Episode chapters and clips list embeds show segment times in row metadata', async ({
    page,
  }) => {
    await test.step('Chapter list rows show chapter start time instead of episode duration', async () => {
      await page.goto(
        `/embed/episode-chapters/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?play_id_text=embSmpEp1Ch02`
      );
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE);
      await expectEmbedListActiveRowMetaContains(page, '0:20');
    });

    await test.step('Clips list rows show clip start and end times when end_time is set', async () => {
      await page.goto(
        `/embed/podcast/${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}?type=clips&play_id_text=${EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT}`
      );
      await expectEmbedListShell(page);
      await expectEmbedListActiveRowLabel(page, EMBED_SAMPLE_CLIP_TITLE);
      await expectEmbedListActiveRowMetaContains(page, '0:05 to 0:10');
    });
  });

  test('List embed shell uses fixed height and internal scrolling', async ({ page }, testInfo) => {
    await test.step('The podcast list shell is about 744px high', async () => {
      await page.goto(`/embed/podcast/${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedShellHeightStable(
        page.getByTestId('embed-list-shell'),
        EMBED_LIST_SHELL_HEIGHT
      );
    });

    await test.step('The scroll fixture channel list region scrolls when rows overflow', async () => {
      await page.goto(`/embed/podcast/${E2E_EMBED_SCROLL_CHANNEL_ID_TEXT}`);
      await expectEmbedListShell(page);
      await expectEmbedListRegionScrollable(page);

      const listRegion = page.getByTestId('embed-list-region');
      await listRegion.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });

      const oldestRow = page.getByTestId('embed-list-row').last();
      await expect(
        oldestRow.getByText(E2E_EMBED_SCROLL_OLDEST_ITEM_LABEL, { exact: true })
      ).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The embed list region scrolls to reveal rows below the fold.',
        listRegion
      );
    });
  });

  test('Private playlist embed renders the not-found shell', async ({ page }) => {
    await page.goto(`/embed/playlist/${E2E_EMBED_PRIVATE_PLAYLIST_ID_TEXT}`);
    await expectEmbedNotFoundShell(page);
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
