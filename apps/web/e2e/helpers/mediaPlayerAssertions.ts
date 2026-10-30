import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  E2E_ADD_BY_RSS_RESOURCE_FRESH_HASH_ID,
  E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_HASH_ID,
  E2E_CLIP_ID_TEXT,
  E2E_EMBED_MUSIC_TRACK_VIDEO_ID_TEXT,
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  E2E_EMBED_VIDEO_ITEM_TWO_ID_TEXT,
  E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_ENDED_ITEM_ID_TEXT,
  E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT,
  E2E_LIVE_AV_HLS_VIDEO_ITEM_ID_TEXT,
  E2E_LIVE_AV_VIDEO_ITEM_ID_TEXT,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_MUSIC_TRACK_TWO_ID_TEXT,
  E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
  E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT,
  E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  E2E_SOUNDBITE_ID_TEXT,
} from './seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';

/**
 * The media player aside renders the same title in both the desktop and
 * mobile sub-components (see
 * `apps/web/src/components/MediaPlayer/Desktop/MediaPlayerInfoDesktop.tsx`
 * and `apps/web/src/components/MediaPlayer/Mobile/MediaPlayerInfoMobile.tsx`).
 * Both nodes are in the DOM at the same time and `aside#media-player`
 * scopes match both of them, so Playwright's default strict-mode locator
 * resolves to 2 elements and `toBeVisible()` fails. Use these helpers in
 * specs to assert on player title presence/absence without depending on
 * the responsive layout in play at runtime.
 *
 * Both bar layouts are in the DOM, and the waited match is a visible one,
 * because each marquee includes a visibility-hidden measurer that can sit
 * earlier in the tree.
 */
export async function expectMediaPlayerTitleVisible(
  page: Page,
  title: string,
  options?: { timeout?: number }
): Promise<void> {
  const titles = page.locator('aside#media-player').getByText(title, { exact: false });
  await expect(titles.filter({ visible: true }).first()).toBeVisible({
    timeout: options?.timeout,
  });
}

/**
 * The persistent player renders play/pause controls in more than one layout at once; only the
 * active viewport's control is visible. `data-media-player-playing="true"` marks the playing
 * state on each of those buttons.
 */
export function persistentPlayerPlayingButtons(page: Page): Locator {
  return page.locator('aside#media-player button[data-media-player-playing="true"]');
}

export async function expectPersistentPlayerPlaying(page: Page, playing: boolean): Promise<void> {
  const playingButtons = persistentPlayerPlayingButtons(page);
  if (playing) {
    await expect(playingButtons.first()).toBeVisible();
    return;
  }
  await expect(playingButtons).toHaveCount(0);
}

/**
 * Wait for the first `<audio>` element to reach at least the given
 * `HTMLMediaElement.readyState`. Used to gate `currentTime` assertions on
 * `loadedmetadata` actually having fired (readyState >= 1 = HAVE_METADATA).
 *
 * Without this gate, `expectAudioCurrentTimeNear` polls `currentTime`
 * before the controller's `handleLoadedMetadata` listener has run, which
 * for non-zero seek targets (clip/soundbite/chapter start, add-by-RSS
 * resume) means the poll observes `currentTime = 0` for the entire 5s
 * window and times out.
 */
export async function waitForAudioReadyAtLeast(
  page: Page,
  minReadyState: number,
  options?: { timeout?: number }
): Promise<void> {
  const audio = page.locator('audio').first();
  await expect(audio).toHaveCount(1);
  await expect
    .poll(
      async () =>
        audio.evaluate((el) => {
          if (!(el instanceof HTMLAudioElement)) {
            return -1;
          }
          return el.readyState;
        }),
      { timeout: options?.timeout ?? 15_000 }
    )
    .toBeGreaterThanOrEqual(minReadyState);
}

/**
 * Removes every seeded media-player queue resource from every queue owned
 * by the logged-in account so that subsequent media-player E2E tests start
 * with a deterministic abridged index regardless of which earlier test ran
 * in the same Playwright invocation (podcast resume rows, chaptered items,
 * embed-video episodes, live audio and video items, music tracks, clips,
 * soundbites, add-by-RSS).
 *
 * Why every queue and not just the seeded `E2E_PODCAST_QUEUE_ID_TEXT`:
 *   Play writes the now-playing row onto the queue the client selects
 *   for the channel medium. A test can leave that position on the seeded
 *   AV queue or on a queue the account created during the run. The next
 *   test then seeks to that position through the abridged index. Walking
 *   every account queue removes the row whichever queue holds it.
 *
 * Idempotent — accepts 404 / nonexistent rows. The podcast-resume and
 * addbyrss-resume specs re-promote their target resource per test, so
 * it is safe to remove these here even for those specs (their
 * beforeEach runs after this helper if they call it).
 */
export async function clearSeededPodcastQueueResources(page: Page): Promise<void> {
  const queuesResp = await page.request.get(`${API_BASE_URL}/queue/all-for-account/private`);
  if (!queuesResp.ok()) {
    throw new Error(
      `Failed to list account queues (status=${queuesResp.status()}): ${await queuesResp.text()}`
    );
  }
  const queues = (await queuesResp.json()) as Array<{ id_text: string }>;

  const itemIdTexts = [
    E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
    E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
    E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
    E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
    E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT,
    E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT,
    E2E_EMBED_VIDEO_ITEM_ID_TEXT,
    E2E_EMBED_VIDEO_ITEM_TWO_ID_TEXT,
    E2E_EMBED_MUSIC_TRACK_VIDEO_ID_TEXT,
    E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
    E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT,
    E2E_LIVE_AV_HLS_VIDEO_ITEM_ID_TEXT,
    E2E_LIVE_AV_VIDEO_ITEM_ID_TEXT,
    E2E_LIVE_AV_ENDED_ITEM_ID_TEXT,
    E2E_MUSIC_TRACK_ONE_ID_TEXT,
    E2E_MUSIC_TRACK_TWO_ID_TEXT,
  ];
  const clipIdTexts = [E2E_CLIP_ID_TEXT];
  const soundbiteIdTexts = [E2E_SOUNDBITE_ID_TEXT];
  const addByRssHashIds = [
    E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_HASH_ID,
    E2E_ADD_BY_RSS_RESOURCE_FRESH_HASH_ID,
  ];

  for (const { id_text: queueIdText } of queues) {
    for (const itemIdText of itemIdTexts) {
      const response = await page.request.delete(
        `${API_BASE_URL}/queue/${queueIdText}/item/${itemIdText}`
      );
      const status = response.status();
      if (![200, 204, 404].includes(status)) {
        throw new Error(
          `Failed to clear queue ${queueIdText} item ${itemIdText} (status=${status}): ${await response.text()}`
        );
      }
    }
    for (const clipIdText of clipIdTexts) {
      const response = await page.request.delete(
        `${API_BASE_URL}/queue/${queueIdText}/clip/${clipIdText}`
      );
      const status = response.status();
      if (![200, 204, 404].includes(status)) {
        throw new Error(
          `Failed to clear queue ${queueIdText} clip ${clipIdText} (status=${status}): ${await response.text()}`
        );
      }
    }
    for (const soundbiteIdText of soundbiteIdTexts) {
      const response = await page.request.delete(
        `${API_BASE_URL}/queue/${queueIdText}/item-soundbite/${soundbiteIdText}`
      );
      const status = response.status();
      if (![200, 204, 404].includes(status)) {
        throw new Error(
          `Failed to clear queue ${queueIdText} soundbite ${soundbiteIdText} (status=${status}): ${await response.text()}`
        );
      }
    }
    for (const hashId of addByRssHashIds) {
      const response = await page.request.delete(
        `${API_BASE_URL}/queue/${queueIdText}/item-add-by-rss/${hashId}`
      );
      const status = response.status();
      if (![200, 204, 404].includes(status)) {
        throw new Error(
          `Failed to clear queue ${queueIdText} add-by-RSS resource ${hashId} (status=${status}): ${await response.text()}`
        );
      }
    }
  }
}

/**
 * `MediaPlayerControllerLiveStreamAV` renders its media element inside a container tagged
 * `data-livestream-player-<mediaType>`. Scoping to that container separates the live element from
 * the always-mounted non-live `<audio>`, which shares the same tag name.
 */
export function liveStreamMediaContainer(page: Page, mediaType: 'audio' | 'video'): Locator {
  return page.locator(`[data-livestream-player-${mediaType}]`);
}

export function liveStreamMediaElement(page: Page, mediaType: 'audio' | 'video'): Locator {
  return liveStreamMediaContainer(page, mediaType).locator(mediaType);
}

/**
 * The media player aside carries its own Play control, so a bare `Play` role query matches it as
 * soon as anything is loaded. Scope detail-page play clicks to `main` to reach the header button.
 */
export async function clickDetailPagePlayButton(page: Page): Promise<void> {
  await page.locator('main').getByRole('button', { name: 'Play' }).first().click();
}

/**
 * Open a seeded live item's detail page and start it. `mediaElementSourceFromTarget` returns `null`
 * for livestream targets, so the non-live `<audio>` stays sourceless and every sourced element on
 * the page belongs to the live controller.
 */
export async function openLivestreamAndPlay(
  page: Page,
  itemIdText: string,
  heading: string
): Promise<void> {
  await page.goto(`/podcast/livestream/${itemIdText}`);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await clickDetailPagePlayButton(page);
}

export async function openEpisodeAndPlay(
  page: Page,
  itemIdText: string,
  heading: string
): Promise<void> {
  await page.goto(`/episode/${itemIdText}`);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await clickDetailPagePlayButton(page);
}

export async function openTrackAndPlay(
  page: Page,
  itemIdText: string,
  trackHeading: string
): Promise<void> {
  await page.goto(`/track/${itemIdText}`);
  await expect(page.getByRole('heading', { name: trackHeading })).toBeVisible();
  await clickDetailPagePlayButton(page);
}

/**
 * Exactly one media element on the page carries a `src`. Two would mean the previous controller was
 * never torn down, which is the double-audio regression the live/non-live transitions guard.
 */
export async function expectSingleSourcedMediaElement(page: Page): Promise<void> {
  await expect(page.locator('audio[src], video[src]')).toHaveCount(1);
}

export async function expectMediaPlayerTitleAbsent(page: Page, title: string): Promise<void> {
  const titles = page.locator('aside#media-player').getByText(title, { exact: false });
  await expect(titles).toHaveCount(0);
}

export async function expectOverlayState(
  page: Page,
  expectedTier: 'vts' | 'tocFalse' | 'chapter' | 'none',
  expectedTitle?: string
) {
  await expect(page.getByTestId('mini-overlay-tier')).toHaveText(expectedTier);
  await expect(page.getByTestId('full-overlay-tier')).toHaveText(expectedTier);

  if (expectedTitle) {
    await expect(page.getByTestId('mini-overlay-title')).toHaveText(expectedTitle);
    await expect(page.getByTestId('full-overlay-title')).toHaveText(expectedTitle);
  }
}

export async function expectInfoLinkTargetsItem(page: Page, expectedPath: string) {
  await expect(page.getByTestId('full-overlay-link')).toHaveAttribute('href', expectedPath);
}

export async function expectLikeAffordanceVisibleWhenLoggedOut(page: Page) {
  await expect(page.getByTestId('auth-status')).toHaveText('logged-out');
  await expect(page.getByTestId('vts-like-heart')).toBeVisible();
}
