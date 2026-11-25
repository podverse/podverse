import { expect, test } from '@playwright/test';

import { getAddByRSSHashId } from '@podverse/helpers';

import { E2E_API_BASE_URL, loginSeedUser } from './helpers/addByRSSCredentials';
import {
  expectMediaPlayerTitleVisible,
  expectPersistentPlayerPlaying,
} from './helpers/mediaPlayerAssertions';
import {
  E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
  E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL,
  E2E_ADD_BY_RSS_CHANNEL_TITLE,
  E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
  E2E_ADD_BY_RSS_ITEM_IMAGE_URL,
  E2E_ADD_BY_RSS_PUB_DATE_ISO,
  E2E_ADDBYRSS_FRESH_ENCLOSURE_URL,
  E2E_PODCAST_QUEUE_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const NOT_FOUND_TEXT = 'This page could not be found.';
const ERROR_BOUNDARY_TITLE = 'Something Went Wrong';

const ADD_BY_RSS_PATHS = [
  '/add-by-rss',
  '/add-by-rss?chip=episodes',
  '/add-by-rss/add',
  '/add-by-rss/podcast/e2ePodChnl001',
  '/add-by-rss/episode/e2eAnyEp01',
  '/add-by-rss/artist/e2eMusicChnl01',
  '/add-by-rss/album/e2eMusicAlbm01',
  '/add-by-rss/track/e2eMusicTrk001',
  '/add-by-rss/podcast/livestream/e2eLiveStrm01',
  '/add-by-rss/music/livestream/e2eAnyLive1',
  '/add-by-rss/credentials/e2eAnyFeed1',
  '/add-by-rss/remote-feed?url=https%3A%2F%2Fexample.com%2Ffeed.xml',
  '/add-by-rss/publishers/e2eAnyPub1',
] as const;

const TITLE = 'E2E Add-by-RSS Catalog Off';
const ADD_BY_RSS_GUID = 'https://e2e-seed-addbyrss.example/item-guid/catalog-off';

/**
 * The feed carries no `podcast:medium`, so the resource data has no `medium_id`. The bundle lets
 * the queue row rebuild the episode without a local parse of the feed.
 */
const addByRSSResourceData: Record<string, unknown> = {
  channel_id_text: E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
  guid: ADD_BY_RSS_GUID,
  title: TITLE,
  pub_date: E2E_ADD_BY_RSS_PUB_DATE_ISO,
  id_text: 'e2eAbRsResC01',
  channel_title: E2E_ADD_BY_RSS_CHANNEL_TITLE,
  channel_images: [{ url: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL, image_width_size: null }],
  item_images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
  enclosure_url: E2E_ADDBYRSS_FRESH_ENCLOSURE_URL,
  duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
  bundle: {
    item: { title: TITLE, guid: ADD_BY_RSS_GUID },
    about: { duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS },
    images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
    description: { value: `${TITLE} deterministic E2E add-by-RSS fixture.` },
    enclosures: [
      {
        item_enclosure: {
          type: 'audio/mpeg',
          length: 0,
          bitrate: 24,
          item_enclosure_default: true,
        },
        item_enclosure_integrity: null,
        item_enclosure_sources: [
          { uri: E2E_ADDBYRSS_FRESH_ENCLOSURE_URL, content_type: 'audio/mpeg' },
        ],
      },
    ],
  },
};

const PODCAST_QUEUE_URL = `${E2E_API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}`;

test.describe('Add by RSS off', () => {
  test('When Add by RSS is off, the sidebar does not offer it.', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page).toHaveURL('/browse');

    const sidebar = page.locator('#sidebar');
    await expect(sidebar.locator('a[href="/add-by-rss"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/queues"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/playlists"]')).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'The sidebar has Queues and Playlists and no Add by RSS link.',
      sidebar
    );
  });

  test('When Add by RSS is off, every Add by RSS URL is the not-found page.', async ({
    page,
  }, testInfo) => {
    for (const path of ADD_BY_RSS_PATHS) {
      await test.step(`Opening ${path} shows the not-found page.`, async () => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
        await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
        const notFoundText = page.getByText(NOT_FOUND_TEXT, { exact: true });
        await expect(notFoundText).toBeVisible();
        await expect(page.getByText(ERROR_BOUNDARY_TITLE)).toHaveCount(0);
        if (path === '/add-by-rss') {
          await expect(page).toHaveURL(/\/add-by-rss$/);
          await capturePageLoad(
            page,
            testInfo,
            'The Add by RSS library shows the not-found page.',
            notFoundText
          );
        }
      });
    }
  });

  test.describe('A saved Add by RSS episode in the queue', () => {
    test.beforeEach(async ({ page }) => {
      await loginSeedUser(page);
      const activate = await page.request.post(`${PODCAST_QUEUE_URL}/update-is-active`, {
        data: { is_active_queue: true },
      });
      expect(activate.ok(), await activate.text()).toBeTruthy();
      const addLast = await page.request.post(`${PODCAST_QUEUE_URL}/item-add-by-rss/last`, {
        data: { add_by_rss_resource_data: addByRSSResourceData },
      });
      expect(addLast.ok(), await addLast.text()).toBeTruthy();
    });

    test.afterEach(async ({ page }) => {
      await page.request.delete(
        `${PODCAST_QUEUE_URL}/item-add-by-rss/${getAddByRSSHashId(addByRSSResourceData)}`
      );
    });

    test('When Add by RSS is off, a saved Add by RSS episode still shows in the queue and plays with a plain title.', async ({
      page,
    }, testInfo) => {
      test.setTimeout(20_000); // Loads the queue, starts audio, and opens the full-size player.

      const episode = page.locator('main').getByRole('button', { name: TITLE }).first();

      await test.step('The queue lists the saved Add by RSS episode.', async () => {
        await page.goto('/queues?medium=av');
        await expect(page).toHaveURL(/\/queues\?medium=av/);
        await expect(episode).toBeVisible();
        await capturePageLoad(
          page,
          testInfo,
          'A saved Add by RSS episode still shows in the queue.',
          episode
        );
      });

      await test.step('Playing the saved episode loads it into the player.', async () => {
        await episode.click();
        await expectMediaPlayerTitleVisible(page, TITLE);
        await expectPersistentPlayerPlaying(page, true);
      });

      await test.step('The full-size player shows the title as plain text.', async () => {
        await page.locator('#media-player').getByRole('button').first().click();
        const dialog = page.getByRole('dialog', { name: 'Fullscreen Media Player' });
        await expect(dialog).toBeVisible();
        const title = dialog.getByTestId('media-player-modal-title');
        await expect(title).toContainText(TITLE);
        await expect(dialog.locator('a[href^="/add-by-rss"]')).toHaveCount(0);
        await capturePageLoad(
          page,
          testInfo,
          'The full-size player shows the Add by RSS title without a link.',
          title
        );
      });
    });

    test('When Add by RSS is off, a saved Add by RSS episode can still be removed from the queue.', async ({
      page,
    }) => {
      const episode = page.locator('main').getByRole('button', { name: TITLE });

      await test.step('The queue lists the saved Add by RSS episode.', async () => {
        await page.goto('/queues?medium=av');
        await expect(page).toHaveURL(/\/queues\?medium=av/);
        await expect(episode.first()).toBeVisible();
      });

      await test.step('Removing the saved episode leaves the queue without it.', async () => {
        const response = await page.request.delete(
          `${PODCAST_QUEUE_URL}/item-add-by-rss/${getAddByRSSHashId(addByRSSResourceData)}`
        );
        expect(response.ok(), await response.text()).toBeTruthy();
        await page.goto('/queues?medium=av');
        await expect(page).toHaveURL(/\/queues\?medium=av/);
        await expect(episode).toHaveCount(0);
      });
    });
  });
});
