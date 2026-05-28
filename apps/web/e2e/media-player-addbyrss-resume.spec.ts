import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  expectMediaPlayerTitleVisible,
  waitForAudioReadyAtLeast,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
  E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL,
  E2E_ADD_BY_RSS_CHANNEL_TITLE,
  E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
  E2E_ADD_BY_RSS_ITEM_IMAGE_URL,
  E2E_ADD_BY_RSS_PUB_DATE_ISO,
  E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID,
  E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT,
  E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID,
  E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT,
  E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS,
  E2E_ADDBYRSS_FRESH_ENCLOSURE_URL,
  E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL,
  E2E_PODCAST_QUEUE_ID_TEXT,
} from './helpers/seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const WITH_POSITION_TITLE = 'E2E Add-by-RSS With Position';
const FRESH_TITLE = 'E2E Add-by-RSS Fresh';

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

/**
 * Wait until the hidden `<audio>` element's `src` reflects the expected
 * enclosure URL. Without this, the fresh-resource branch could pass
 * before the audio actually loaded (default `currentTime` is 0), which
 * would not exercise the matrix § 1 add-by-RSS code path.
 */
async function expectAudioSrcMatches(page: Page, enclosureUrl: string): Promise<void> {
  const audio = audioLocator(page);
  await expect(audio).toHaveAttribute('src', enclosureUrl, { timeout: 15000 });
}

/**
 * Mirror of `tools/web/seed-e2e.mjs` `buildAddByRssResourceDataSeed` /
 * `buildAddByRssBundleSeed`. Building the same payload in the spec lets the
 * API match the seeded queue_resource row by `add_by_rss_hash_id` (md5 of
 * channel_id_text + guid) when promoting the resource to now-playing while
 * keeping the bundle intact so `loadAddByRSSIndexItemFromResourceData` can
 * reconstruct the index item without IndexedDB.
 */
type AddByRssBundleInput = {
  guid: string;
  title: string;
  enclosureUrl: string;
};

function buildAddByRssBundle({ guid, title, enclosureUrl }: AddByRssBundleInput): object {
  return {
    item: { title, guid },
    about: { duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS },
    images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
    description: { value: `${title} deterministic E2E add-by-RSS fixture.` },
    enclosures: [
      {
        item_enclosure: {
          type: 'audio/mpeg',
          length: 0,
          bitrate: 24,
          item_enclosure_default: true,
        },
        item_enclosure_integrity: null,
        item_enclosure_sources: [{ uri: enclosureUrl, content_type: 'audio/mpeg' }],
      },
    ],
  };
}

type AddByRssResourceInput = {
  itemIdText: string;
  guid: string;
  title: string;
  enclosureUrl: string;
};

function buildAddByRssResourceData({
  itemIdText,
  guid,
  title,
  enclosureUrl,
}: AddByRssResourceInput): object {
  return {
    channel_id_text: E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
    guid,
    title,
    pub_date: E2E_ADD_BY_RSS_PUB_DATE_ISO,
    id_text: itemIdText,
    medium_id: 1,
    channel_title: E2E_ADD_BY_RSS_CHANNEL_TITLE,
    channel_image_url: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL,
    channel_images: [{ url: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL, image_width_size: null }],
    item_images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
    enclosure_url: enclosureUrl,
    duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
    bundle: buildAddByRssBundle({ guid, title, enclosureUrl }),
  };
}

const withPositionResourceData = buildAddByRssResourceData({
  itemIdText: E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT,
  guid: E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID,
  title: WITH_POSITION_TITLE,
  enclosureUrl: E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL,
});

const freshResourceData = buildAddByRssResourceData({
  itemIdText: E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT,
  guid: E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID,
  title: FRESH_TITLE,
  enclosureUrl: E2E_ADDBYRSS_FRESH_ENCLOSURE_URL,
});

/**
 * Promote a seeded add-by-RSS resource to now-playing (list_position = 0)
 * in the podcast queue. The seed inserts both resources at list_position
 * 3/4 with deterministic `playback_position` values; this helper moves
 * one to position 0 so the QueueController auto-load on the next page
 * mount triggers `handleLoadQueueItemAddByRSS`. `playback_position` is
 * passed explicitly so the value is independent of seed run order or
 * prior test state.
 */
async function promoteAddByRssResourceToNowPlaying(
  page: Page,
  resourceData: object,
  playbackPositionSeconds: number
): Promise<void> {
  const response = await page.request.post(
    `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item-add-by-rss/now-playing`,
    {
      data: {
        add_by_rss_resource_data: resourceData,
        playback_position: playbackPositionSeconds,
        media_file_duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
      },
    }
  );
  expect(response.ok(), await response.text()).toBeTruthy();
}

/**
 * Matrix cells (see
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`):
 *   - § 1 "Initial load" — add-by-RSS seeks to `addByRSSSeekToTime` when
 *     it resolves to `>= 0`; otherwise 0.
 *   - § 3 "Queue load" — add-by-RSS queue resource passes
 *     `playback_position` to `handleLoadQueueItemAddByRSS` →
 *     `playAddByRSS(indexItem, playbackPosition)`.
 *
 * The seed inserts two add-by-RSS resources in the podcast queue at
 * list_position 3 (with stored `playback_position`) and list_position
 * 4 (fresh, `playback_position = 0`). Each test promotes the relevant
 * resource to now-playing via the queue API in `beforeEach`, then waits
 * for the QueueController auto-load on `/` to drive playback through
 * `MediaPlayerController.handleLoadQueueItemAddByRSS`. Server-side
 * `add_by_rss_credentials` encryption is configured via
 * `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` in
 * `apps/web/playwright.e2e-server-env.ts` (already pinned to a test
 * sentinel).
 */
test.describe('Media player add-by-RSS resume position', () => {
  test.beforeEach(() => {
    test.setTimeout(20_000);
  });

  test('Loading an add-by-RSS episode with a saved playback_position seeks to that position on loadedmetadata', async ({
    page,
  }) => {
    await loginSeedUser(page);
    await promoteAddByRssResourceToNowPlaying(
      page,
      withPositionResourceData,
      E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS
    );

    await page.goto('/');

    await expectMediaPlayerTitleVisible(page, WITH_POSITION_TITLE);
    await expectAudioSrcMatches(page, E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS);
  });

  test('Loading an add-by-RSS episode without a saved playback_position starts at 0', async ({
    page,
  }) => {
    await loginSeedUser(page);
    await promoteAddByRssResourceToNowPlaying(page, freshResourceData, 0);

    await page.goto('/');

    await expectMediaPlayerTitleVisible(page, FRESH_TITLE);
    await expectAudioSrcMatches(page, E2E_ADDBYRSS_FRESH_ENCLOSURE_URL);
    await expectAudioCurrentTimeNear(page, 0);
  });
});
