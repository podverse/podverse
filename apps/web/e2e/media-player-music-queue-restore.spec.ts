import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  clickDetailPagePlayButton,
  expectMediaPlayerTitleAbsent,
  expectMediaPlayerTitleVisible,
  expectPersistentPlayerPlaying,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_MUSIC_QUEUE_ID_TEXT,
  E2E_MUSIC_TRACK_DURATION_SECONDS,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  E2E_PODCAST_QUEUE_ID_TEXT,
} from './helpers/seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const MUSIC_QUEUE_RESTORE_P_SECONDS = 15;
const MUSIC_TRACK_ONE_TITLE = 'E2E Music Track One';
const PODCAST_RESUME_TITLE = 'E2E Podcast Resume P > 0';
const PODCAST_NO_STORED_POSITION_TITLE = 'E2E Podcast No Stored Position';

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
        last_played_at: new Date().toISOString(),
        media_file_duration: E2E_MUSIC_TRACK_DURATION_SECONDS,
        playback_event_kind: 'play',
        playback_position: playbackPositionSeconds,
      },
    }
  );
  expect(response.ok(), await response.text()).toBeTruthy();
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 3 "Queue load" — logged-in queue hydration uses `session_restore` for
 *     music so `playback_position` resumes on full page load. An empty player
 *     with only an upcoming head promotes that row without a listen, then
 *     loads it paused. When the last-active queue is empty, the other medium's
 *     queue is tried next (still without recording a listen).
 *   - § 5 "Skip-next / Track-ended" — advances set `fresh_transition` so the
 *     next music track still starts at 0 (covered in
 *     `media-player-music-playback.spec.ts`).
 */
test.describe('Media player logged-in music queue restore', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);
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

  test('Full page load promotes an upcoming-only music queue head into the player without recording a listen', async ({
    page,
  }) => {
    const activate = await page.request.post(
      `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/update-is-active`,
      { data: { is_active_queue: true } }
    );
    expect(activate.ok(), await activate.text()).toBeTruthy();

    const addLast = await page.request.post(
      `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/item/${E2E_MUSIC_TRACK_ONE_ID_TEXT}/last`,
      { data: { playback_event_kind: 'queue_add' } }
    );
    expect(addLast.ok(), await addLast.text()).toBeTruthy();

    const before = await page.request.get(
      `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/resources/now-playing`
    );
    expect(before.ok(), await before.text()).toBeTruthy();
    expect(await before.json()).toBeNull();

    await page.goto('/');
    await expectMediaPlayerTitleVisible(page, MUSIC_TRACK_ONE_TITLE);

    const audio = audioLocator(page);
    await expect
      .poll(async () => audio.evaluate((el) => el instanceof HTMLAudioElement && el.paused))
      .toBe(true);

    await expect
      .poll(async () => {
        const response = await page.request.get(
          `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/resources/now-playing`
        );
        if (!response.ok()) {
          return 'missing';
        }
        const body: unknown = await response.json();
        if (typeof body !== 'object' || body === null || !('item' in body)) {
          return 'empty';
        }
        const item = body.item;
        const itemIdText =
          typeof item === 'object' &&
          item !== null &&
          'id_text' in item &&
          typeof item.id_text === 'string'
            ? item.id_text
            : '';
        const lastPlayedAt = 'last_played_at' in body ? body.last_played_at : null;
        if (itemIdText !== E2E_MUSIC_TRACK_ONE_ID_TEXT) {
          return 'other-item';
        }
        if (lastPlayedAt !== null && lastPlayedAt !== undefined) {
          return 'stamped';
        }
        return 'promoted';
      })
      .toBe('promoted');
  });

  test('Full page load falls back to the other queue when the last-active queue is empty', async ({
    page,
  }) => {
    const activate = await page.request.post(
      `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/update-is-active`,
      { data: { is_active_queue: true } }
    );
    expect(activate.ok(), await activate.text()).toBeTruthy();

    const addLast = await page.request.post(
      `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}/last`,
      { data: { playback_event_kind: 'queue_add' } }
    );
    expect(addLast.ok(), await addLast.text()).toBeTruthy();

    const musicNowPlaying = await page.request.get(
      `${API_BASE_URL}/queue/${E2E_MUSIC_QUEUE_ID_TEXT}/resources/now-playing`
    );
    expect(musicNowPlaying.ok(), await musicNowPlaying.text()).toBeTruthy();
    expect(await musicNowPlaying.json()).toBeNull();

    await page.goto('/');
    await expectMediaPlayerTitleVisible(page, PODCAST_RESUME_TITLE);

    const audio = audioLocator(page);
    await expect
      .poll(async () => audio.evaluate((el) => el instanceof HTMLAudioElement && el.paused))
      .toBe(true);

    await expect
      .poll(async () => {
        const response = await page.request.get(
          `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/resources/now-playing`
        );
        if (!response.ok()) {
          return 'missing';
        }
        const body: unknown = await response.json();
        if (typeof body !== 'object' || body === null || !('item' in body)) {
          return 'empty';
        }
        const item = body.item;
        const itemIdText =
          typeof item === 'object' &&
          item !== null &&
          'id_text' in item &&
          typeof item.id_text === 'string'
            ? item.id_text
            : '';
        const lastPlayedAt = 'last_played_at' in body ? body.last_played_at : null;
        if (itemIdText !== E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT) {
          return 'other-item';
        }
        if (lastPlayedAt !== null && lastPlayedAt !== undefined) {
          return 'stamped';
        }
        return 'promoted';
      })
      .toBe('promoted');
  });

  test('An explicit Play during empty-player queue-head adoption keeps the clicked episode', async ({
    page,
  }) => {
    await promoteMusicTrackToNowPlaying(page, MUSIC_QUEUE_RESTORE_P_SECONDS);

    let releaseHeldItem!: () => void;
    const heldItemReleased = new Promise<void>((resolve) => {
      releaseHeldItem = resolve;
    });
    let markItemRequestSeen!: () => void;
    const itemRequestSeen = new Promise<void>((resolve) => {
      markItemRequestSeen = resolve;
    });
    let musicChannelId: number | string | null = null;

    await page.route(`**/api/v2/item/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`, async (route) => {
      markItemRequestSeen();
      await heldItemReleased;
      const response = await route.fetch();
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'channel_id' in body &&
        (typeof body.channel_id === 'number' || typeof body.channel_id === 'string')
      ) {
        musicChannelId = body.channel_id;
      }
      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: JSON.stringify(body),
      });
    });

    await page.goto(`/episode/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}`);
    await expect(
      page.getByRole('heading', { name: PODCAST_NO_STORED_POSITION_TITLE })
    ).toBeVisible();
    await itemRequestSeen;

    await clickDetailPagePlayButton(page);
    await expectPersistentPlayerPlaying(page, true);
    await expectMediaPlayerTitleVisible(page, PODCAST_NO_STORED_POSITION_TITLE);

    const channelResponsePromise = page.waitForResponse((response) => {
      if (musicChannelId === null) {
        return false;
      }
      return (
        response.url().includes(`/api/v2/channel/${musicChannelId}`) &&
        response.request().method() === 'GET' &&
        response.ok()
      );
    });
    releaseHeldItem();
    await channelResponsePromise;
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    );

    await expectMediaPlayerTitleVisible(page, PODCAST_NO_STORED_POSITION_TITLE);
    await expectMediaPlayerTitleAbsent(page, MUSIC_TRACK_ONE_TITLE);
    await expectPersistentPlayerPlaying(page, true);
  });
});
