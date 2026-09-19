import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  expectSingleSourcedMediaElement,
  liveStreamMediaElement,
  openEpisodeAndPlay,
  openLivestreamAndPlay,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_AUDIO_ITEM_TITLE,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
} from './helpers/seedConstants';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const PODCAST_ITEM_TITLE = 'E2E Podcast No Stored Position';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

/**
 * Matrix cell (see `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md` § 6a
 * "Non-live → live transition"): once `mpItem.live_item` is truthy the non-live path stops
 * assigning a source, so the previous `<audio>` must be left paused and sourceless while the
 * live-stream controller takes over as the only sourced element.
 */
test.describe('Media player podcast to live-stream transition', () => {
  test('Transitioning from a regular podcast item to a live audio stream pauses the non-live element and starts video.js cleanly', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);

    await test.step('A regular podcast item plays through the non-live `<audio>` element', async () => {
      await openEpisodeAndPlay(page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, PODCAST_ITEM_TITLE);

      await waitForAudioReadyAtLeast(page, 1);
      await expectSingleSourcedMediaElement(page);
    });

    await openLivestreamAndPlay(page, E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT, E2E_LIVE_AV_AUDIO_ITEM_TITLE);

    await test.step('The live-stream controller mounts video.js and becomes the only sourced media element', async () => {
      const liveAudio = liveStreamMediaElement(page, 'audio');
      await expect(liveAudio).toHaveCount(1);
      await expect(liveAudio).toHaveClass(/vjs-tech/);
      await expectSingleSourcedMediaElement(page);
    });

    await test.step('The non-live element is paused, so both sources are never audible at once', async () => {
      const nonLivePaused = await page.evaluate(() =>
        Array.from(document.querySelectorAll('audio'))
          .filter((el) => el.closest('[data-vjs-player-audio]') === null)
          .every((el) => el.paused)
      );
      expect(nonLivePaused).toBe(true);
    });

    expect(pageErrors, pageErrors.join('\n')).toHaveLength(0);
  });
});
