import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  readAnonymousSnapshotFromPage,
  writeAnonymousSnapshotBeforeNavigation,
} from './helpers/anonymousSnapshot';
import {
  expectMediaPlayerTitleAbsent,
  expectMediaPlayerTitleVisible,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT,
  E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT,
  E2E_MUSIC_TRACK_DURATION_SECONDS,
  E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL,
  E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS,
  E2E_PODCAST_RESUME_ENCLOSURE_URL,
} from './helpers/seedConstants';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const PODCAST_SNAPSHOT_RESUME_SECONDS = 30;
const MUSIC_SNAPSHOT_POSITION_SECONDS = 45;
const PODCAST_RESUME_TITLE = 'E2E Podcast Resume P > 0';
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

async function expectAudioSrcMatches(page: Page, enclosureUrl: string): Promise<void> {
  const audio = audioLocator(page);
  await expect(audio).toHaveAttribute('src', enclosureUrl, { timeout: 15000 });
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 2 "Anonymous restore" — first page load while logged out reads the
 *     `localStorage` snapshot via `AnonymousPlaybackRestoreController` and
 *     resumes via `mediaPlayerResourceUpdate({ mpCurrentTime, mpDuration })`.
 *   - § 2 — music items always seek to `0` on every load regardless of
 *     the stored snapshot position (the music seek-to-0 rule in
 *     `MediaPlayerControllerAV.handleLoadedMetadata`).
 *   - § 2 — on login, the snapshot is cleared via
 *     `clearAnonymousPlaybackSnapshot()` and the restore path is skipped
 *     for the rest of the session.
 *
 * The snapshot is primed via `page.addInitScript` so it lands in
 * `localStorage` before any app scripts run on the next navigation.
 * `AnonymousPlaybackRestoreController` mounts in
 * `apps/web/src/app/layout.tsx`, so any first navigation triggers it.
 *
 * The "clip-snapshot seeks to clip start" inconsistency noted in matrix
 * § 2 is intentionally left uncovered here — see
 * `MEDIA-PLAYER-DECISION-MATRIX.md` for the rationale. A future Phase 2
 * orchestration change would add a new branch.
 */
test.describe('Media player anonymous playback restore', () => {
  test.beforeEach(() => {
    test.setTimeout(20_000);
  });

  test('First page load while logged out resumes the saved podcast item at the stored snapshot position', async ({
    page,
  }) => {
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT,
      playbackPositionSeconds: PODCAST_SNAPSHOT_RESUME_SECONDS,
      mediaFileDurationSeconds: E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS,
    });

    await page.goto('/');

    await expectMediaPlayerTitleVisible(page, PODCAST_RESUME_TITLE);
    await expectAudioSrcMatches(page, E2E_PODCAST_RESUME_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, PODCAST_SNAPSHOT_RESUME_SECONDS);
  });

  test('First page load while logged out for a music snapshot starts the track at 0 because music forces seek-to-0 on every load', async ({
    page,
  }) => {
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT,
      playbackPositionSeconds: MUSIC_SNAPSHOT_POSITION_SECONDS,
      mediaFileDurationSeconds: E2E_MUSIC_TRACK_DURATION_SECONDS,
    });

    await page.goto('/');

    await expectMediaPlayerTitleVisible(page, MUSIC_TRACK_ONE_TITLE);
    await expectAudioSrcMatches(page, E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, 0);
  });

  test('Logging in clears the anonymous snapshot and skips the restore path so the music snapshot target never loads', async ({
    page,
  }) => {
    /**
     * Point the snapshot at the music track so it is distinguishable from
     * whatever the now-playing podcast queue resolves to in full-suite
     * order. If the restore path incorrectly ran, the media player would
     * load the music track; if the controller correctly cleared the
     * snapshot and skipped restore, the music track never appears in the
     * player.
     *
     * This test intentionally does NOT assert on which podcast-queue
     * resource drives playback after login because the seeded queue is
     * shared mutable state and other specs in `e2e_test_report` order may
     * leave it pointing at an add-by-RSS resource or another seeded item.
     * Asserting only on snapshot-cleared + music-never-loaded keeps this
     * test deterministic regardless of suite order.
     */
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT,
      playbackPositionSeconds: MUSIC_SNAPSHOT_POSITION_SECONDS,
      mediaFileDurationSeconds: E2E_MUSIC_TRACK_DURATION_SECONDS,
    });

    await loginSeedUser(page);
    await page.goto('/');

    await expect.poll(async () => readAnonymousSnapshotFromPage(page)).toBeNull();

    await expectMediaPlayerTitleAbsent(page, MUSIC_TRACK_ONE_TITLE);
  });
});
