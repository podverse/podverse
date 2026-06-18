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
} from './helpers/seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const MUSIC_QUEUE_RESTORE_P_SECONDS = 15;
const MUSIC_TRACK_ONE_TITLE = 'E2E Music Track One';

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

async function promoteMusicTrackToNowPlaying(
  page: Page,
  playbackPositionSeconds: number
): Promise<void> {
  const response = await page.request.post(
    `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/item/${E2E_MUSIC_TRACK_ONE_ID_TEXT}/now-playing`,
    {
      data: {
        playback_position: playbackPositionSeconds,
        media_file_duration: E2E_MUSIC_TRACK_DURATION_SECONDS,
      },
    }
  );
  expect(response.ok(), await response.text()).toBeTruthy();
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 3 "Queue load" — logged-in queue hydration uses `session_restore` for
 *     music so `playback_position` resumes on full page load.
 *   - § 5 "Skip-next / Track-ended" — advances set `fresh_transition` so the
 *     next music track still starts at 0 (covered in
 *     `media-player-music-playback.spec.ts`).
 */
test.describe('Media player logged-in music queue restore', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await loginSeedUser(page);
  });

  test('Full page load resumes a logged-in music now-playing row at the stored playback_position', async ({
    page,
  }) => {
    await promoteMusicTrackToNowPlaying(page, MUSIC_QUEUE_RESTORE_P_SECONDS);

    await page.goto('/');
    await expectMediaPlayerTitleVisible(page, MUSIC_TRACK_ONE_TITLE);
    await expectAudioCurrentTimeNear(page, MUSIC_QUEUE_RESTORE_P_SECONDS);

    await page.reload();
    await expectMediaPlayerTitleVisible(page, MUSIC_TRACK_ONE_TITLE);
    await expectAudioCurrentTimeNear(page, MUSIC_QUEUE_RESTORE_P_SECONDS);
  });
});
