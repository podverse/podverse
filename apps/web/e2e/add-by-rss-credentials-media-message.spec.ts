import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { getAddByRSSHashId } from '@podverse/helpers';

import {
  buildE2eProtectedFeedUrl,
  E2E_API_BASE_URL,
  E2E_BASIC_AUTH_AUDIO_URL,
  followFeedOnServer,
  loginSeedUser,
  readNeedsCredentialsFeedIdText,
  unfollowFeedOnServer,
} from './helpers/addByRSSCredentials';
import {
  E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL,
  E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
  E2E_ADD_BY_RSS_ITEM_IMAGE_URL,
  E2E_ADD_BY_RSS_PUB_DATE_ISO,
  E2E_PODCAST_QUEUE_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const FEED_URL = buildE2eProtectedFeedUrl('credentials-media-message');
const FEED_TITLE = 'E2E protected media feed';
const ITEM_ID_TEXT = 'e2eAbRsResP01';
const ITEM_GUID = 'https://e2e-seed-addbyrss.example/item-guid/protected-media';
const ITEM_TITLE = 'E2E protected media episode';
const MEDIA_MESSAGE = /browsers cannot send to audio and video files/;

function buildProtectedResourceData(channelIdText: string): Record<string, unknown> {
  return {
    channel_id_text: channelIdText,
    guid: ITEM_GUID,
    title: ITEM_TITLE,
    pub_date: E2E_ADD_BY_RSS_PUB_DATE_ISO,
    id_text: ITEM_ID_TEXT,
    medium_id: 1,
    channel_title: FEED_TITLE,
    channel_image_url: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL,
    channel_images: [{ url: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL, image_width_size: null }],
    item_images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
    enclosure_url: E2E_BASIC_AUTH_AUDIO_URL,
    duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
    bundle: {
      item: { title: ITEM_TITLE, guid: ITEM_GUID },
      about: { duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS },
      images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
      enclosures: [
        {
          item_enclosure: { type: 'audio/mpeg', length: 0, item_enclosure_default: true },
          item_enclosure_integrity: null,
          item_enclosure_sources: [{ uri: E2E_BASIC_AUTH_AUDIO_URL, content_type: 'audio/mpeg' }],
        },
      ],
    },
  };
}

async function setNowPlaying(page: Page, resourceData: Record<string, unknown>): Promise<void> {
  const response = await page.request.post(
    `${E2E_API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item-add-by-rss/now-playing`,
    {
      data: {
        add_by_rss_resource_data: resourceData,
        playback_position: 0,
        media_file_duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
      },
    }
  );
  expect(response.ok(), await response.text()).toBeTruthy();
}

/**
 * Web always loads the plain enclosure URL: a media element cannot attach Basic Auth. When the
 * host demands it (test-assets gates `/basic-auth/`), the player explains why instead of
 * failing silently.
 */
test.describe('Add by RSS protected media on the web', () => {
  let resourceData: Record<string, unknown> | null = null;

  test.afterEach(async ({ page }) => {
    if (resourceData) {
      await page.request.delete(
        `${E2E_API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item-add-by-rss/${getAddByRSSHashId(resourceData)}`
      );
      resourceData = null;
    }
    await unfollowFeedOnServer(page, FEED_URL);
  });

  test('playing protected media loads the plain URL and explains the failure', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);
    await loginSeedUser(page);
    await followFeedOnServer(page, {
      feedUrl: FEED_URL,
      title: FEED_TITLE,
      requiresCredentials: true,
    });

    await page.goto('/add-by-rss/podcasts');
    const channelIdText = await readNeedsCredentialsFeedIdText(page, FEED_TITLE);
    resourceData = buildProtectedResourceData(channelIdText);
    await setNowPlaying(page, resourceData);

    await page.goto('/');

    await test.step('The player requests the enclosure URL without credentials', async () => {
      const audio = page.locator('audio').first();
      await expect(audio).toHaveAttribute('src', E2E_BASIC_AUTH_AUDIO_URL, { timeout: 15_000 });
    });

    await test.step('The failed load explains that browsers cannot send credentials to media', async () => {
      const message = page.getByText(MEDIA_MESSAGE);
      await expect(message).toBeVisible({ timeout: 15_000 });

      await capturePageLoad(
        page,
        testInfo,
        'Protected media that the browser cannot load shows an explanation and suggests the mobile app.',
        message
      );
    });
  });
});
