import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  readAnonymousSnapshotFromPage,
  writeAnonymousSnapshotBeforeNavigation,
} from './helpers/anonymousSnapshot';
import {
  expectMediaPlayerTitleAbsent,
  expectMediaPlayerTitleVisible,
  expectPersistentPlayerPlaying,
  expectSingleSourcedMediaElement,
  liveStreamMediaElement,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT,
  E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT,
  E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_AUDIO_ITEM_TITLE,
  E2E_LIVE_AV_ENDED_ITEM_ID_TEXT,
  E2E_LIVE_AV_ENDED_ITEM_TITLE,
  E2E_MUSIC_TRACK_DURATION_SECONDS,
  E2E_MUSIC_TRACK_NEAR_END_P_SECONDS,
  E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL,
  E2E_MUSIC_TRACK_ONE_P_SECONDS,
  E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS,
  E2E_PODCAST_RESUME_ENCLOSURE_URL,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const PODCAST_SNAPSHOT_RESUME_SECONDS = 30;
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

function channelIdFromItemBody(body: unknown): number {
  if (
    body === null ||
    typeof body !== 'object' ||
    !('channel_id' in body) ||
    typeof body.channel_id !== 'number'
  ) {
    throw new Error('Item response is missing channel_id');
  }
  return body.channel_id;
}

function visiblePlayerTitle(page: Page, title: string): Locator {
  return page
    .locator('aside#media-player')
    .getByText(title, { exact: false })
    .filter({ visible: true })
    .first();
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 2 "Anonymous restore" — first page load while logged out reads the
 *     `localStorage` snapshot via `AnonymousPlaybackRestoreController` and
 *     resumes via `mediaPlayerResourceUpdate({ mpCurrentTime, mpDuration })`.
 *   - § 2 — music items resume at the stored snapshot position on
 *     anonymous restore (`session_restore`, near-end clamp). Snapshot
 *     seconds must be within fixture duration and below `duration - 5`
 *     (see `E2E_MUSIC_TRACK_*` in seedConstants).
 *   - § 2 — on login, the snapshot is cleared via
 *     `clearAnonymousPlaybackSnapshot()` and the restore path is skipped
 *     for the rest of the session.
 *   - § 2 — a livestream snapshot is decided from the item the server
 *     returns: ended clears the snapshot, live restores a paused livestream,
 *     and no answer restores the snapshot's stored copy.
 *
 * The snapshot is primed via `page.addInitScript` so it lands in
 * `localStorage` before any app scripts run on the next navigation.
 * `AnonymousPlaybackRestoreController` mounts in
 * `apps/web/src/app/layout.tsx`, so any first navigation triggers it.
 *
 * Clip/soundbite snapshots seek to segment start (matrix § 2 by design);
 * not covered in this spec.
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

  test('First page load while logged out for a music snapshot resumes the track at the stored snapshot position', async ({
    page,
  }) => {
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT,
      playbackPositionSeconds: E2E_MUSIC_TRACK_ONE_P_SECONDS,
      mediaFileDurationSeconds: E2E_MUSIC_TRACK_DURATION_SECONDS,
    });

    await page.goto('/');

    await expectMediaPlayerTitleVisible(page, MUSIC_TRACK_ONE_TITLE);
    await expectAudioSrcMatches(page, E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, E2E_MUSIC_TRACK_ONE_P_SECONDS);
  });

  test('First page load while logged out for a music snapshot within 5 seconds of duration seeks to 0', async ({
    page,
  }) => {
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT,
      playbackPositionSeconds: E2E_MUSIC_TRACK_NEAR_END_P_SECONDS,
      mediaFileDurationSeconds: E2E_MUSIC_TRACK_DURATION_SECONDS,
    });

    await page.goto('/');

    await expectMediaPlayerTitleVisible(page, MUSIC_TRACK_ONE_TITLE);
    await expectAudioSrcMatches(page, E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, 0);
  });

  test('First page load while logged out for a snapshot of an ended livestream clears the snapshot and leaves the player empty', async ({
    page,
  }, testInfo) => {
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_LIVE_AV_ENDED_ITEM_ID_TEXT,
      playbackPositionSeconds: 42,
      mediaFileDurationSeconds: 120,
    });

    await page.goto('/');
    await expect(page).toHaveURL('/');

    await expect.poll(async () => readAnonymousSnapshotFromPage(page)).toBeNull();
    await expectMediaPlayerTitleAbsent(page, E2E_LIVE_AV_ENDED_ITEM_TITLE);
    await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(0);
    await capturePageLoad(page, testInfo, 'An ended livestream snapshot leaves the player empty.');
  });

  test('First page load while logged out for a snapshot of a live livestream restores it paused as a livestream', async ({
    page,
  }, testInfo) => {
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
      playbackPositionSeconds: 42,
      mediaFileDurationSeconds: 120,
    });

    await page.goto('/');
    await expect(page).toHaveURL('/');

    await expectMediaPlayerTitleVisible(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE);
    await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(1);
    await expectSingleSourcedMediaElement(page);
    await expectPersistentPlayerPlaying(page, false);
    await capturePageLoad(
      page,
      testInfo,
      'A live livestream snapshot restores paused.',
      visiblePlayerTitle(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE)
    );
  });

  test('First page load while logged out restores the stored copy of a livestream when the server cannot answer for the item', async ({
    page,
  }, testInfo) => {
    const itemResponse = await page.request.get(
      `${API_BASE_URL}/item/${E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT}`
    );
    expect(itemResponse.ok(), `GET item failed with status ${itemResponse.status()}`).toBeTruthy();
    const storedItem: unknown = await itemResponse.json();
    const channelId = channelIdFromItemBody(storedItem);
    const channelResponse = await page.request.get(`${API_BASE_URL}/channel/${channelId}`);
    expect(
      channelResponse.ok(),
      `GET channel failed with status ${channelResponse.status()}`
    ).toBeTruthy();
    const storedChannel: unknown = await channelResponse.json();

    await page.route(
      (url) => url.pathname.endsWith(`/item/${E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT}`),
      (route) => route.fulfill({ status: 503, body: '' })
    );
    await writeAnonymousSnapshotBeforeNavigation(page, {
      kind: 'item',
      itemIdText: E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
      playbackPositionSeconds: 0,
      storedItem,
      storedChannel,
    });

    await page.goto('/');
    await expect(page).toHaveURL('/');

    await expectMediaPlayerTitleVisible(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE);
    await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(1);
    await expectPersistentPlayerPlaying(page, false);
    expect(await readAnonymousSnapshotFromPage(page)).not.toBeNull();
    await capturePageLoad(
      page,
      testInfo,
      'A livestream snapshot restores its stored copy when the server cannot answer.',
      visiblePlayerTitle(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE)
    );
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
      playbackPositionSeconds: E2E_MUSIC_TRACK_ONE_P_SECONDS,
      mediaFileDurationSeconds: E2E_MUSIC_TRACK_DURATION_SECONDS,
    });

    await loginSeedUser(page);
    await page.goto('/');

    await expect.poll(async () => readAnonymousSnapshotFromPage(page)).toBeNull();

    await expectMediaPlayerTitleAbsent(page, MUSIC_TRACK_ONE_TITLE);
  });
});
