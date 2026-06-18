import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  embedTitleLocator,
  expectEmbedRootVisible,
  expectEmbedSingleShell,
} from './helpers/embedAssertions';
import { waitForAudioReadyAtLeast } from './helpers/mediaPlayerAssertions';
import {
  EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
  EMBED_FIXTURE_CLIP_VIDEO_ID_TEXT,
  EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
  EMBED_SAMPLE_CLIP_END_SECONDS,
  EMBED_SAMPLE_CLIP_TITLE,
  EMBED_SAMPLE_SOUNDBITE_DURATION_SECONDS,
  EMBED_SAMPLE_SOUNDBITE_START_SECONDS,
  EMBED_SAMPLE_SOUNDBITE_TITLE,
} from './helpers/seedConstants';

async function expectEmbedMediaPaused(page: Page): Promise<void> {
  const media = page.locator('video, audio').first();
  await expect
    .poll(
      async () =>
        media.evaluate((el) => {
          if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) {
            return el.paused;
          }
          return false;
        }),
      { timeout: 10_000 }
    )
    .toBe(true);
}

async function fastForwardEmbedMediaTo(page: Page, seconds: number): Promise<void> {
  const video = page.locator('video').first();
  const audio = page.locator('audio').first();
  const media = (await video.count()) > 0 ? video : audio;
  await expect(media).toHaveCount(1);
  if ((await audio.count()) > 0) {
    await waitForAudioReadyAtLeast(page, 1);
  }
  await media.evaluate((el, nextTime) => {
    if (!(el instanceof HTMLVideoElement) && !(el instanceof HTMLAudioElement)) {
      throw new Error('Expected embed media element.');
    }
    el.currentTime = nextTime;
    el.dispatchEvent(new Event('timeupdate'));
  }, seconds);
}

async function playEmbed(page: Page): Promise<void> {
  await page.getByTestId('embed-player-play-button-cell').getByRole('button').click();
  const video = page.locator('video').first();
  if ((await video.count()) > 0) {
    await expect
      .poll(async () => video.evaluate((el) => el instanceof HTMLVideoElement && !el.paused), {
        timeout: 10_000,
      })
      .toBe(true);
    return;
  }
  await waitForAudioReadyAtLeast(page, 1);
}

test.describe('Embed clip and soundbite end UI', () => {
  test.setTimeout(30_000);

  test('Audio clip embed clears clip title after playback passes clip.end_time + 1', async ({
    page,
  }) => {
    await page.goto(`/embed/clip/${EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT}`);
    await expectEmbedRootVisible(page);
    await expectEmbedSingleShell(page);
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CLIP_TITLE);

    await playEmbed(page);
    await fastForwardEmbedMediaTo(page, EMBED_SAMPLE_CLIP_END_SECONDS + 1);

    await expectEmbedMediaPaused(page);
    await expect(embedTitleLocator(page)).not.toContainText(EMBED_SAMPLE_CLIP_TITLE);
  });

  test('Video clip embed hides the segment info bar after playback passes clip.end_time + 1', async ({
    page,
  }) => {
    await page.goto(`/embed/clip/${EMBED_FIXTURE_CLIP_VIDEO_ID_TEXT}?presentation=video`);
    await expectEmbedRootVisible(page);
    await expectEmbedSingleShell(page);
    await expect(page.getByTestId('embed-segment-info-bar')).toBeVisible();
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_CLIP_TITLE);

    await playEmbed(page);
    await fastForwardEmbedMediaTo(page, EMBED_SAMPLE_CLIP_END_SECONDS + 1);

    await expectEmbedMediaPaused(page);
    await expect(page.getByTestId('embed-segment-info-bar')).toHaveCount(0);
    await expect(embedTitleLocator(page)).not.toContainText(EMBED_SAMPLE_CLIP_TITLE);
  });

  test('Official-clip embed clears soundbite title after playback passes segment end + 1', async ({
    page,
  }) => {
    await page.goto(`/embed/official-clip/${EMBED_FIXTURE_SOUNDBITE_ID_TEXT}`);
    await expectEmbedRootVisible(page);
    await expectEmbedSingleShell(page);
    await expect(embedTitleLocator(page)).toContainText(EMBED_SAMPLE_SOUNDBITE_TITLE);

    await playEmbed(page);
    await fastForwardEmbedMediaTo(
      page,
      EMBED_SAMPLE_SOUNDBITE_START_SECONDS + EMBED_SAMPLE_SOUNDBITE_DURATION_SECONDS + 1.1
    );

    await expectEmbedMediaPaused(page);
    await expect(embedTitleLocator(page)).not.toContainText(EMBED_SAMPLE_SOUNDBITE_TITLE);
  });
});
