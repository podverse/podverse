import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  expectMediaPlayerTitleVisible,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_MUSIC_QUEUE_ID_TEXT,
  E2E_MUSIC_TRACK_DURATION_SECONDS,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_MUSIC_TRACK_TWO_ID_TEXT,
} from './helpers/seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function audioLocator(page: Page): Locator {
  return page.locator('audio').first();
}

async function expectAudioCurrentTimeNear(page: Page, expectedSeconds: number): Promise<void> {
  const audio = audioLocator(page);
  await expect(audio).toHaveCount(1);
  await waitForAudioReadyAtLeast(page, 1);
  await expect
    .poll(async () => {
      const currentTime = await audio.evaluate((el) => {
        if (!(el instanceof HTMLAudioElement)) {
          return Number.NaN;
        }
        return el.currentTime;
      });
      return currentTime >= expectedSeconds - 0.25 && currentTime <= expectedSeconds + 2;
    })
    .toBe(true);
}

async function fastForwardAudioTo(page: Page, seconds: number): Promise<void> {
  await audioLocator(page).evaluate((el, nextTime) => {
    if (!(el instanceof HTMLAudioElement)) {
      throw new Error('Expected first media element to be an audio element.');
    }
    el.currentTime = nextTime;
    el.dispatchEvent(new Event('timeupdate'));
  }, seconds);
}

async function openTrackAndPlay(
  page: Page,
  itemIdText: string,
  trackHeading: string
): Promise<void> {
  await page.goto(`/track/${itemIdText}`);
  await expect(page.getByRole('heading', { name: trackHeading })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();
}

/**
 * Removes track-2 from the seeded music queue so handleEnded falls through
 * to the auto-queue path. Accepts both 200 (removed) and 404 (already gone
 * from a prior test in the same run) since this spec mutates queue state.
 */
async function removeMusicTrackTwoFromQueue(page: Page): Promise<void> {
  const deleteResponse = await page.request.delete(
    `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/item/${E2E_MUSIC_TRACK_TWO_ID_TEXT}`
  );
  const status = deleteResponse.status();
  expect([200, 204, 404], await deleteResponse.text()).toContain(status);
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — explicit Play on a track seeks to 0 (`explicit_play`).
 *   - § 3 "Queue load" — logged-in hydration resume is covered in
 *     `media-player-music-queue-restore.spec.ts`.
 *   - § 5 "Track-ended" — non add-by-RSS, queue has next →
 *     `setMPShouldPlay(true)` and the next track loads at 0.
 *   - § 4 "AutoQueue transition" — auto-queue does **not** silently resume
 *     the previous track's saved position when transitioning between music
 *     tracks; the music seek-to-0 rule applies on every load.
 *
 * Pure-function and orchestration coverage exists in
 * `Controller/__tests__/NonLiveMediaOrchestrator.seekPolicy.test.tsx`.
 */
test.describe('Media player music playback', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await loginSeedUser(page);
  });

  test('Explicitly playing a music track seeks the player to 0 even when a stored position exists', async ({
    page,
  }) => {
    await openTrackAndPlay(page, E2E_MUSIC_TRACK_ONE_ID_TEXT, 'E2E Music Track One');

    await expectAudioCurrentTimeNear(page, 0);
    await expectMediaPlayerTitleVisible(page, 'E2E Music Track One');
  });

  test('A music track that ends loads the next queued music track at currentTime 0', async ({
    page,
  }) => {
    await openTrackAndPlay(page, E2E_MUSIC_TRACK_ONE_ID_TEXT, 'E2E Music Track One');
    await expectAudioCurrentTimeNear(page, 0);

    await fastForwardAudioTo(page, E2E_MUSIC_TRACK_DURATION_SECONDS - 0.2);

    await expectMediaPlayerTitleVisible(page, 'E2E Music Track Two');
    await expectAudioCurrentTimeNear(page, 0);
  });

  test("AutoQueue transition between music tracks always starts the next track from 0 and never silently resumes the previous track's saved position", async ({
    page,
  }) => {
    await removeMusicTrackTwoFromQueue(page);

    await openTrackAndPlay(page, E2E_MUSIC_TRACK_ONE_ID_TEXT, 'E2E Music Track One');
    await expectAudioCurrentTimeNear(page, 0);

    await fastForwardAudioTo(page, E2E_MUSIC_TRACK_DURATION_SECONDS - 0.2);

    await expectMediaPlayerTitleVisible(page, 'E2E Music Track Two');
    await expectAudioCurrentTimeNear(page, 0);
  });
});
