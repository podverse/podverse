import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  expectPersistentPlayerPlaying,
  expectSingleSourcedMediaElement,
  liveStreamMediaElement,
  openEpisodeAndPlay,
  openLivestreamAndPlay,
  persistentPlayerPlayingButtons,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_AUDIO_ITEM_TITLE,
  E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_HLS_AUDIO_ITEM_TITLE,
  E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT,
  E2E_LIVE_AV_HLS_REWIND_ITEM_TITLE,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
} from './helpers/seedConstants';
import { captureVerifiedElement } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const PODCAST_ITEM_TITLE = 'E2E Podcast No Stored Position';
const BEHIND_LIVE_LABEL = /^\u2212\d+:\d{2}$/;

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function player(page: Page) {
  return page.locator('aside#media-player');
}

/**
 * Matrix cells (see `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md` § 6a
 * "Live time and duration", "Rewind window", "Play after pause", and "Live control"): the
 * duration slot is the Live control, the time slot shows how far behind live the playhead is,
 * and the scrubber and skip buttons appear only for a rewindable window.
 */
test.describe('Media player livestream live controls', () => {
  test("Starting a progressive livestream after an episode shows Live in place of the episode's duration, hides rewind controls, and reconnects when Live is pressed after a pause", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);

    await test.step('A regular episode shows a clock duration in the player', async () => {
      await openEpisodeAndPlay(page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, PODCAST_ITEM_TITLE);
      await expect(page).toHaveURL(
        new RegExp(`/episode/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}(?:\\?.*)?$`)
      );
      await expect(
        player(page).locator('[data-testid="media-player-duration"]:visible')
      ).toHaveText(/^\d+:\d{2}$/);
    });

    await test.step('The progressive livestream shows Live and hides the duration, behind-live time, scrubber, and skip buttons', async () => {
      await openLivestreamAndPlay(
        page,
        E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
        E2E_LIVE_AV_AUDIO_ITEM_TITLE
      );
      await expect(page).toHaveURL(
        new RegExp(`/podcast/livestream/${E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT}(?:\\?.*)?$`)
      );

      const liveControl = player(page).getByRole('button', { name: 'Go to Live', exact: true });
      await expect(liveControl).toBeVisible();
      await expect(liveControl).toHaveText('Live');
      await expect(
        player(page).locator('[data-testid="media-player-duration"]:visible')
      ).toHaveCount(0);
      await expect(
        player(page).locator('[data-testid="media-player-live-behind"]:visible')
      ).toHaveCount(0);
      await expect(
        player(page).locator('[data-testid="media-player-live-scrubber"]:visible')
      ).toHaveCount(0);
      await expect(player(page).getByRole('button', { name: /^Jump Back/ })).toHaveCount(0);
      await expect(player(page).getByRole('button', { name: /^Jump Forward/ })).toHaveCount(0);
    });

    await test.step('Pressing Live after a pause reconnects the progressive stream and plays', async () => {
      const liveAudio = liveStreamMediaElement(page, 'audio');
      await expect(liveAudio).toHaveCount(1);
      await liveAudio.evaluate((el) => {
        el.setAttribute('data-e2e-connection', 'first');
      });

      await persistentPlayerPlayingButtons(page).first().click();
      await expectPersistentPlayerPlaying(page, false);

      await player(page).getByRole('button', { name: 'Go to Live', exact: true }).click();
      await expectPersistentPlayerPlaying(page, true);
      await expect(page.locator('[data-e2e-connection="first"]')).toHaveCount(0);

      const reconnected = liveStreamMediaElement(page, 'audio');
      await expect(reconnected).toHaveCount(1);
      await expect(reconnected).toHaveAttribute('src', /.+/);
      await expectSingleSourcedMediaElement(page);
    });

    expect(pageErrors, pageErrors.join('\n')).toHaveLength(0);
  });

  test('A long HLS live window can be rewound with the scrubber, resumes where it was paused, and returns to the live moment when Live is pressed', async ({
    page,
  }, testInfo) => {
    // hls.js loads lazily and the EVENT playlist must load before the window exists.
    test.setTimeout(30_000);

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await loginSeedUser(page);

    await test.step('The rewindable livestream shows a scrubber and a Jump Back button, and no behind-live time', async () => {
      await openLivestreamAndPlay(
        page,
        E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT,
        E2E_LIVE_AV_HLS_REWIND_ITEM_TITLE
      );
      await expect(page).toHaveURL(
        new RegExp(`/podcast/livestream/${E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT}(?:\\?.*)?$`)
      );
      await expect(
        player(page).locator('[data-testid="media-player-live-scrubber"]:visible')
      ).toBeVisible();
      await expect(player(page).getByRole('button', { name: /^Jump Back/ })).toBeVisible();
      await expect(
        player(page).locator('[data-testid="media-player-live-behind"]:visible')
      ).toHaveCount(0);
    });

    await test.step('Dragging the scrubber back shows how far behind live the playhead is', async () => {
      await persistentPlayerPlayingButtons(page).first().click();
      await expectPersistentPlayerPlaying(page, false);

      const scrubber = player(page).locator('[data-testid="media-player-live-scrubber"]:visible');
      const box = await scrubber.boundingBox();
      if (box === null) {
        throw new Error('The live scrubber has no box.');
      }
      await scrubber.click({ position: { x: box.width * 0.1, y: box.height / 2 } });

      await expect(
        player(page).locator('[data-testid="media-player-live-behind"]:visible')
      ).toHaveText(BEHIND_LIVE_LABEL);
    });

    await test.step('Pressing Play resumes at the rewound moment', async () => {
      await player(page).getByRole('button', { name: 'Play', exact: true }).click();
      await expectPersistentPlayerPlaying(page, true);
      await expect(
        player(page).locator('[data-testid="media-player-live-behind"]:visible')
      ).toBeVisible();
    });

    await test.step('Pressing Live returns to the live moment and keeps playback on', async () => {
      const liveControl = player(page).getByRole('button', { name: 'Go to Live', exact: true });
      await liveControl.click();
      await expect(
        player(page).locator('[data-testid="media-player-live-behind"]:visible')
      ).toHaveCount(0);
      await expect(liveControl).toHaveAttribute('data-at-live-edge', 'true');
      await expectPersistentPlayerPlaying(page, true);

      await captureVerifiedElement(
        page,
        testInfo,
        liveControl,
        'The Live control is at the live edge after Go to Live on a rewindable livestream.'
      );
    });

    expect(pageErrors, pageErrors.join('\n')).toHaveLength(0);
  });

  test('A short HLS live window shows Live without a scrubber or skip buttons', async ({
    page,
  }) => {
    // hls.js loads lazily and the EVENT playlist must load before the window exists.
    test.setTimeout(30_000);

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await loginSeedUser(page);
    await openLivestreamAndPlay(
      page,
      E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT,
      E2E_LIVE_AV_HLS_AUDIO_ITEM_TITLE
    );
    await expect(page).toHaveURL(
      new RegExp(`/podcast/livestream/${E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT}(?:\\?.*)?$`)
    );

    await test.step('The short HLS livestream plays, shows Live, and hides the scrubber and Jump Back', async () => {
      const liveAudio = liveStreamMediaElement(page, 'audio');
      await expect
        .poll(async () =>
          liveAudio.evaluate((el) => (el instanceof HTMLAudioElement ? el.currentTime : 0))
        )
        .toBeGreaterThan(0);
      await expect(
        player(page).getByRole('button', { name: 'Go to Live', exact: true })
      ).toBeVisible();
      await expect(
        player(page).locator('[data-testid="media-player-live-scrubber"]:visible')
      ).toHaveCount(0);
      await expect(player(page).getByRole('button', { name: /^Jump Back/ })).toHaveCount(0);
    });

    expect(pageErrors, pageErrors.join('\n')).toHaveLength(0);
  });
});
