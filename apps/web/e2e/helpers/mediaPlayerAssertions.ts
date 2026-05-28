import crypto from 'node:crypto';

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
  E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID,
  E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID,
  E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';

/**
 * Replicates the seed's `computeAddByRssHashSeed` and the API server's
 * `add_by_rss_hash_id` derivation: md5 of the JSON-stringified subset of
 * `{ channel_id_text, guid }` (key insertion order preserved). Used to
 * delete seeded add-by-RSS queue resources by hash id.
 */
function computeAddByRssHashId(channelIdText: string, guid: string): string {
  const minimal: Record<string, string> = {};
  if (channelIdText) minimal.channel_id_text = channelIdText;
  if (guid) minimal.guid = guid;
  return crypto.createHash('md5').update(JSON.stringify(minimal)).digest('hex');
}

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
 */
export async function expectMediaPlayerTitleVisible(
  page: Page,
  title: string,
  options?: { timeout?: number }
): Promise<void> {
  const titles = page.locator('aside#media-player').getByText(title, { exact: false });
  await expect(titles.first()).toBeVisible({ timeout: options?.timeout });
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
 * Removes every seeded podcast / add-by-RSS resource from every queue
 * owned by the logged-in account so that subsequent media-player E2E
 * tests start with a deterministic abridged index regardless of which
 * earlier test ran in the same Playwright invocation.
 *
 * Why every queue and not just the seeded `E2E_PODCAST_QUEUE_ID_TEXT`:
 *   `useQueueResourceUpdateNowPlaying` looks up the active queue by
 *   `getQueueMediumIdFromMediumId(mpChannel.medium_id)`, which maps
 *   podcast → `MediumEnum.AV` (id 20). The seeded queue has
 *   `medium_id = MediumEnum.Podcast` (id 2), so when a test clicks Play
 *   on the chaptered item the app does not find a matching queue and
 *   auto-creates a new AV queue (random id_text such as `Xb82kbPW5x`)
 *   to host the now-playing record. That new queue then survives across
 *   tests in the same Playwright invocation and its `p` value reaches
 *   `handleLoadedMetadata` via the abridged index, which made the next
 *   test seek to the previous test's playback position. Iterating over
 *   every queue here removes the resource regardless of which queue
 *   was used.
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
  ];
  const addByRssHashIds = [
    computeAddByRssHashId(
      E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
      E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID
    ),
    computeAddByRssHashId(E2E_ADD_BY_RSS_CHANNEL_ID_TEXT, E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID),
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
