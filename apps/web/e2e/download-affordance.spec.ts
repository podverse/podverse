import type { Page, Request } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_HLS_VOD_ITEM_ID_TEXT,
  E2E_HLS_VOD_ITEM_TITLE,
  E2E_LIVESTREAM_ITEM_ID_TEXT,
  E2E_LIVESTREAM_ITEM_TITLE,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
  E2E_PODCAST_RESUME_ENCLOSURE_URL,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const DOWNLOAD_EPISODE = 'Download episode';
const DOWNLOAD_ERROR = 'Error downloading episode';

async function openEpisode(page: Page, itemIdText: string, title: string): Promise<void> {
  await page.goto(`/episode/${itemIdText}`);
  await expect(page).toHaveURL(new RegExp(`/episode/${itemIdText}`));
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

async function openDownloadEpisodeItem(page: Page) {
  await page.getByRole('button', { name: 'More options' }).first().click();
  const downloadItem = page.getByRole('menuitem', { name: DOWNLOAD_EPISODE });
  await expect(downloadItem).toBeVisible();
  return downloadItem;
}

function recordPlaylistRequests(page: Page): Request[] {
  const playlistRequests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().includes('.m3u8')) {
      playlistRequests.push(request);
    }
  });
  return playlistRequests;
}

test.describe('Direct download affordance', () => {
  test('When an episode has a progressive file, Download episode requests that file.', async ({
    page,
  }, testInfo) => {
    await test.step('Open the seeded progressive episode', async () => {
      await openEpisode(page, E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT, 'E2E Podcast Resume P > 0');
      await capturePageLoad(page, testInfo, 'The progressive episode detail page loads.');
    });

    const downloadItem = await test.step('The episode menu offers Download episode', async () => {
      const item = await openDownloadEpisodeItem(page);
      await actionAndCapture(
        page,
        testInfo,
        'The episode menu offers Download episode for the progressive file.',
        async () => {
          await expect(item).toBeVisible();
        },
        item
      );
      return item;
    });

    await test.step('Choosing Download episode requests the progressive file', async () => {
      const downloadRequest = page.waitForRequest(
        (request) => request.url() === E2E_PODCAST_RESUME_ENCLOSURE_URL
      );
      const playlistRequests = recordPlaylistRequests(page);
      await downloadItem.click();
      const request = await downloadRequest;

      expect(request.url()).toBe(E2E_PODCAST_RESUME_ENCLOSURE_URL);
      expect(playlistRequests).toHaveLength(0);
    });
  });

  test('When the enclosure is only an HLS playlist, Download episode does not request it.', async ({
    page,
  }, testInfo) => {
    await test.step('Open the seeded HLS episode', async () => {
      await openEpisode(page, E2E_HLS_VOD_ITEM_ID_TEXT, E2E_HLS_VOD_ITEM_TITLE);
      await capturePageLoad(page, testInfo, 'The HLS episode detail page loads.');
    });

    const downloadItem = await test.step('The menu still lists Download episode', async () => {
      return openDownloadEpisodeItem(page);
    });

    await test.step('Download episode shows an error and skips the playlist', async () => {
      const playlistRequests = recordPlaylistRequests(page);
      await downloadItem.click();
      const errorToast = page.getByText(DOWNLOAD_ERROR, { exact: true });
      await expect(errorToast).toBeVisible();
      expect(playlistRequests).toHaveLength(0);

      await actionAndCapture(
        page,
        testInfo,
        'Download episode on an HLS-only episode shows the download error.',
        async () => {
          await expect(errorToast).toBeVisible();
        },
        errorToast
      );
    });
  });

  test('When a livestream has no progressive file, Download episode is not offered.', async ({
    page,
  }, testInfo) => {
    await test.step('Open the seeded livestream item', async () => {
      await page.goto(`/podcast/livestream/${E2E_LIVESTREAM_ITEM_ID_TEXT}`);
      await expect(page).toHaveURL(
        new RegExp(`/podcast/livestream/${E2E_LIVESTREAM_ITEM_ID_TEXT}`)
      );
      await expect(page.getByRole('heading', { name: E2E_LIVESTREAM_ITEM_TITLE })).toBeVisible();
      await capturePageLoad(page, testInfo, 'The livestream detail page loads.');
    });

    await test.step('No open menu offers Download episode', async () => {
      const moreButtons = page.getByRole('button', { name: 'More options' });
      const moreCount = await moreButtons.count();
      for (let index = 0; index < moreCount; index += 1) {
        await moreButtons.nth(index).click();
        await expect(page.getByRole('menuitem', { name: DOWNLOAD_EPISODE })).toHaveCount(0);
        await page.keyboard.press('Escape');
      }
      await expect(page.getByRole('menuitem', { name: DOWNLOAD_EPISODE })).toHaveCount(0);

      await capturePageLoad(page, testInfo, 'The livestream page does not offer Download episode.');
    });
  });
});
