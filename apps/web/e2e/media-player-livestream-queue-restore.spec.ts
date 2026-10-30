import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  expectMediaPlayerTitleAbsent,
  expectMediaPlayerTitleVisible,
  expectPersistentPlayerPlaying,
  expectSingleSourcedMediaElement,
  liveStreamMediaElement,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_AUDIO_ITEM_TITLE,
  E2E_LIVE_AV_ENDED_ITEM_ID_TEXT,
  E2E_LIVE_AV_ENDED_ITEM_TITLE,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
  E2E_PODCAST_QUEUE_ID_TEXT,
} from './helpers/seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const PODCAST_NO_STORED_POSITION_TITLE = 'E2E Podcast No Stored Position';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

async function putNowPlaying(page: Page, itemIdText: string): Promise<void> {
  const nowPlaying = await page.request.post(
    `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item/${itemIdText}/now-playing`,
    {
      data: {
        last_played_at: new Date().toISOString(),
        media_file_duration: 120,
        playback_event_kind: 'play',
        playback_position: 0,
      },
    }
  );
  expect(nowPlaying.ok(), await nowPlaying.text()).toBeTruthy();

  const activate = await page.request.post(
    `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/update-is-active`,
    { data: { is_active_queue: true } }
  );
  expect(activate.ok(), await activate.text()).toBeTruthy();
}

async function historyItemIdTexts(page: Page): Promise<string[]> {
  const response = await page.request.get(
    `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/resources/history-paginated`
  );
  if (!response.ok()) {
    return [];
  }
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    return [];
  }
  const rows = body.data;
  if (!Array.isArray(rows)) {
    return [];
  }
  const itemIdTexts: string[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null || !('item' in row)) {
      continue;
    }
    const item = row.item;
    if (
      typeof item === 'object' &&
      item !== null &&
      'id_text' in item &&
      typeof item.id_text === 'string'
    ) {
      itemIdTexts.push(item.id_text);
    }
  }
  return itemIdTexts;
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 3 "Queue load" — a queue head whose item is a livestream is decided from the item read
 *     fresh on that load. Ended: the row moves to history and the next row loads paused through
 *     the empty-player path; with nothing left, the player stays empty. Live or scheduled: it
 *     loads as a `livestream` target. No answer: the queue row's own copy of the item loads at the
 *     row's position.
 *   - § 3 "Queue load" — the handoff prompt is never offered for an ended or missing livestream
 *     head (covered by the queue-head loading unit tests).
 */
test.describe('Media player logged-in livestream queue restore', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(20_000);
    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);
  });

  test('Full page load moves an ended livestream at the queue head to history and loads the next queue item paused', async ({
    page,
  }) => {
    await putNowPlaying(page, E2E_LIVE_AV_ENDED_ITEM_ID_TEXT);
    const addLast = await page.request.post(
      `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}/last`,
      { data: { playback_event_kind: 'queue_add' } }
    );
    expect(addLast.ok(), await addLast.text()).toBeTruthy();

    await page.goto('/');
    await expectMediaPlayerTitleVisible(page, PODCAST_NO_STORED_POSITION_TITLE);
    await expectPersistentPlayerPlaying(page, false);
    await expectMediaPlayerTitleAbsent(page, E2E_LIVE_AV_ENDED_ITEM_TITLE);

    await expect.poll(() => historyItemIdTexts(page)).toContain(E2E_LIVE_AV_ENDED_ITEM_ID_TEXT);
  });

  test('Full page load leaves the player empty when the only queue item is an ended livestream', async ({
    page,
  }) => {
    await putNowPlaying(page, E2E_LIVE_AV_ENDED_ITEM_ID_TEXT);

    await page.goto('/');
    await expect.poll(() => historyItemIdTexts(page)).toContain(E2E_LIVE_AV_ENDED_ITEM_ID_TEXT);
    await expectMediaPlayerTitleAbsent(page, E2E_LIVE_AV_ENDED_ITEM_TITLE);
    await expect(page.locator('audio[src], video[src]')).toHaveCount(0);
  });

  test('Full page load restores a live livestream at the queue head paused as a livestream', async ({
    page,
  }) => {
    await putNowPlaying(page, E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT);

    await page.goto('/');
    await expectMediaPlayerTitleVisible(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE);
    await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(1);
    await expectSingleSourcedMediaElement(page);
    await expectPersistentPlayerPlaying(page, false);
  });

  test("Full page load loads the queue row's copy of the head paused when the server cannot answer for the item", async ({
    page,
  }) => {
    await putNowPlaying(page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT);
    await page.route(
      (url) => url.pathname.endsWith(`/item/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}`),
      (route) => route.fulfill({ status: 503, body: '' })
    );

    await page.goto('/');
    await expectMediaPlayerTitleVisible(page, PODCAST_NO_STORED_POSITION_TITLE);
    await expectPersistentPlayerPlaying(page, false);
  });
});
