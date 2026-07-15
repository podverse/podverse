import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS,
  E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS,
  E2E_PODCAST_QUEUE_ID_TEXT,
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

async function openEpisodeAndPlay(page: Page, itemIdText: string, heading: string): Promise<void> {
  await page.goto(`/episode/${itemIdText}`);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();
}

/**
 * Re-promote a seeded podcast item to now-playing in the seeded podcast
 * queue with the exact `playback_position` and `media_file_duration` the
 * spec assumes. This restores the abridged-index entry that earlier
 * media-player specs delete via `clearSeededPodcastQueueResources`. The
 * helper is idempotent — `addItemToNowPlaying` updates the existing row
 * when the item already sits in the queue.
 */
async function promotePodcastItemToNowPlaying(
  page: Page,
  itemIdText: string,
  playbackPositionSeconds: number
): Promise<void> {
  const response = await page.request.post(
    `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item/${itemIdText}/now-playing`,
    {
      data: {
        playback_position: playbackPositionSeconds,
        media_file_duration: E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS,
      },
    }
  );
  expect(response.ok(), await response.text()).toBeTruthy();
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — item-podcast seeks to abridged `p` when `p > 0`,
 *     else 0.
 *   - § "Near-end clamp (the 5-second rule)" — when `p >= d - 5`,
 *     `useMediaPlayerResourceUpdate` clamps `mpCurrentTime` to 0 before
 *     metadata loads.
 *   - § 3 "Queue load" — manual queue load drives this path via
 *     `handleLoadQueueItem`.
 *
 * Orchestration coverage of the seek policy itself is in
 * `Controller/__tests__/NonLiveMediaOrchestrator.seekPolicy.test.tsx`; the
 * hook-level near-end clamp pin is in
 * `useMediaPlayerResourceUpdate.nearEndClamp.test.tsx`.
 */
test.describe('Media player podcast resume position', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);
  });

  test('Loading a podcast episode with a stored mid-position seeks the player to that position', async ({
    page,
  }) => {
    await promotePodcastItemToNowPlaying(
      page,
      E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
      E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS
    );

    await openEpisodeAndPlay(
      page,
      E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
      'E2E Podcast Resume P > 0'
    );

    await expectAudioCurrentTimeNear(page, E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS);
  });

  test('Loading a podcast episode whose stored position is within 5 seconds of duration resets to 0', async ({
    page,
  }) => {
    await promotePodcastItemToNowPlaying(
      page,
      E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
      E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS
    );

    await openEpisodeAndPlay(
      page,
      E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
      'E2E Podcast Resume Near End'
    );

    await expectAudioCurrentTimeNear(page, 0);
  });

  test('Loading a podcast episode with no stored position seeks the player to 0 on loadedmetadata', async ({
    page,
  }) => {
    await openEpisodeAndPlay(
      page,
      E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
      'E2E Podcast No Stored Position'
    );

    await expectAudioCurrentTimeNear(page, 0);
  });
});
