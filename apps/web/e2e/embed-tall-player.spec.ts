import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS,
  E2E_EMBED_VIDEO_CHANNEL_ID_TEXT,
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
} from './helpers/seedConstants';
import {
  expectEmbedListShell,
  expectEmbedShortShellNoVideoElement,
  expectEmbedTallCenterArt,
  expectEmbedTallVideoElement,
} from './helpers/embedAssertions';
import { EMBED_LIST_ROW_HEIGHT_PX } from '../src/lib/embed/embedLayoutTokens';
import { capturePageLoad } from './helpers/stepScreenshots';

async function hoverProgressBarCenter(page: Page): Promise<void> {
  const progressBar = page.locator('[class*="customProgressBar"]').first();
  const barBox = await progressBar.boundingBox();
  expect(barBox).not.toBeNull();
  if (barBox === null) {
    return;
  }

  await page.mouse.move(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
}

test.describe('Embed tall player', () => {
  test('When a single tall embed is paused, the tall stage and overlay controls are visible.', async ({
    page,
  }, testInfo) => {
    await page.goto(
      `/embed/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}?presentation=video&player=tall`
    );
    await expect(page.getByTestId('embed-single-shell')).toBeVisible();
    await expect(page.getByTestId('embed-tall-stage')).toBeVisible();
    await expect(page.getByTestId('embed-tall-video-element')).toBeVisible();
    await expect(page.getByTestId('embed-tall-info-overlay')).toBeVisible();
    await expect(page.getByTestId('embed-tall-controls-overlay')).toBeVisible();
    await expect(page.getByTestId('embed-tall-mute-toggle')).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The single tall embed renders the inline video stage and both overlays.',
      page.getByTestId('embed-tall-stage')
    );
  });

  test('When a music track embed uses presentation=video without an explicit player param, the tall player shell renders.', async ({
    page,
  }) => {
    await page.goto(`/embed/track/${EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT}?presentation=video`);
    await expect(page.getByTestId('embed-single-shell')).toBeVisible();
    await expect(page.getByTestId('embed-tall-stage')).toBeVisible();
    await expect(page.getByTestId('embed-tall-info-overlay')).toBeVisible();
    await expect(page.getByTestId('embed-tall-controls-overlay')).toBeVisible();
    await expect(
      page.getByTestId('embed-tall-info-overlay').getByTestId('embed-player-info')
    ).toBeVisible();
  });

  test('When an audio episode uses tall player with prefer video, the inline video element renders for the video enclosure.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?presentation=video&player=tall`
    );
    await expectEmbedTallVideoElement(page);
    await expect(page.getByTestId('embed-tall-center-art')).toHaveCount(0);
  });

  test('When an audio episode uses tall player with prefer audio, center artwork renders instead of a video element.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?presentation=audio&player=tall`
    );
    await expectEmbedTallCenterArt(page);
    await expect(page.getByTestId('embed-tall-video-element')).toHaveCount(0);
  });

  test('When a tall audio episode switches to a video alternate enclosure, the inline video element appears.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?presentation=audio&player=tall`
    );
    await expectEmbedTallCenterArt(page);
    await expect(page.getByTestId('embed-tall-video-element')).toHaveCount(0);

    await page.getByTestId('embed-player-alternate-enclosure-button').click();
    await page.getByTestId('embed-alternate-enclosure-option-video-mp4').click();

    await expectEmbedTallVideoElement(page);
    await expect(page.getByTestId('embed-tall-center-art')).toHaveCount(0);
  });

  test('When a short player prefers video on a video episode, playback uses the short shell without a video element.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}?presentation=video&player=short`
    );
    await expectEmbedShortShellNoVideoElement(page);
    await expect(page.getByTestId('embed-player-controls')).toBeVisible();
  });

  test('When an album list embed uses tall player with prefer video, the inline video element renders for the active track.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/album/${EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT}?presentation=video&player=tall`
    );
    await expectEmbedListShell(page);
    await expectEmbedTallVideoElement(page);
    await expect(page.getByTestId('embed-tall-center-art')).toHaveCount(0);
  });

  test('When switching rows in a tall list embed, the mute toggle stays unmuted.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/podcast/${E2E_EMBED_VIDEO_CHANNEL_ID_TEXT}?presentation=video&player=tall`
    );
    await expectEmbedListShell(page);

    await page.getByTestId('embed-list-row-active').getByRole('button').last().click();
    await expect(page.getByTestId('embed-tall-mute-toggle')).toHaveAttribute('aria-label', 'Mute');

    await page
      .getByTestId('embed-list-row')
      .filter({ hasText: 'Episode Two (video)' })
      .getByRole('button')
      .last()
      .click();
    await expect(page.getByTestId('embed-list-row-active')).toContainText('Episode Two (video)');
    await expect(page.getByTestId('embed-tall-mute-toggle')).toHaveAttribute('aria-label', 'Mute');
  });

  test('When hovering the tall mute control, a popover with a vertical volume bar appears.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}?presentation=video&player=tall`
    );
    await expect(page.getByTestId('embed-tall-stage')).toBeVisible();

    const muteToggle = page.getByTestId('embed-tall-mute-toggle');
    await expect(muteToggle).toBeVisible();
    await expect(page.getByTestId('embed-tall-volume-popover')).toHaveCount(0);

    await muteToggle.hover();
    await expect(page.getByTestId('embed-tall-volume-popover')).toBeVisible();
    await expect(page.getByTestId('embed-tall-volume-popover').getByRole('slider')).toHaveAttribute(
      'aria-orientation',
      'vertical'
    );
  });

  test('When comparing chapter hover behavior, tall presentation shows a chapter tooltip while short presentation does not.', async ({
    page,
  }) => {
    await page.goto(`/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?player=short`);
    await expect(page.getByTestId('embed-single-shell')).toBeVisible();
    await hoverProgressBarCenter(page);
    await expect(page.getByRole('tooltip')).toHaveCount(0);

    await page.goto(
      `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}?presentation=video&player=tall&t=${EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS + 6}`
    );
    await expect(page.getByTestId('embed-tall-stage')).toBeVisible();
    await expect(page.getByTestId('embed-segment-info-bar')).toBeVisible();
    await expect(page.getByTestId('embed-title-toggle')).toHaveCount(0);
    await hoverProgressBarCenter(page);
    await expect(page.getByRole('tooltip')).toBeVisible();
  });

  test('When a tall list embed uses rows=3, the list region keeps a fixed 3-row viewport.', async ({
    page,
  }) => {
    await page.goto(
      `/embed/podcast/${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}?presentation=video&player=tall&rows=3`
    );
    await expect(page.getByTestId('embed-list-shell')).toBeVisible();
    const listRegion = page.getByTestId('embed-list-region');
    const box = await listRegion.boundingBox();
    expect(box).not.toBeNull();
    if (box !== null) {
      const expectedListRegionHeight = 3 * EMBED_LIST_ROW_HEIGHT_PX;
      expect(box.height).toBeGreaterThanOrEqual(expectedListRegionHeight - 2);
      expect(box.height).toBeLessThanOrEqual(expectedListRegionHeight + 2);
    }
  });
});
