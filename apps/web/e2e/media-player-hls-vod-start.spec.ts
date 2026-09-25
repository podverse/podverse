import { expect, test } from '@playwright/test';

import { waitForAudioReadyAtLeast } from './helpers/mediaPlayerAssertions';
import { E2E_HLS_VOD_ITEM_ID_TEXT, E2E_HLS_VOD_ITEM_TITLE } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Non-live HLS playback start', () => {
  test('starts playback from the seeded VOD HLS playlist enclosure', async ({ page }, testInfo) => {
    test.setTimeout(45_000);

    await test.step('Open the seeded HLS episode', async () => {
      await page.goto(`/episode/${E2E_HLS_VOD_ITEM_ID_TEXT}`);
      await expect(page.getByRole('heading', { name: E2E_HLS_VOD_ITEM_TITLE })).toBeVisible();
    });

    await test.step('Play until the HLS playlist loads and the playhead moves', async () => {
      const hlsPlaylistResponse = page.waitForResponse(
        (response) => response.url().includes('/e2e/hls/e2e-hls-vod.m3u8') && response.ok()
      );
      await page.getByRole('button', { name: 'Play' }).first().click();
      await hlsPlaylistResponse;
      await waitForAudioReadyAtLeast(page, 2, { timeout: 20_000 });

      const audio = page.locator('audio').first();
      await expect
        .poll(async () =>
          audio.evaluate((el) => (el instanceof HTMLAudioElement ? el.currentTime : 0))
        )
        .toBeGreaterThan(0);

      await capturePageLoad(
        page,
        testInfo,
        'Non-live playback has started from the VOD HLS playlist enclosure.'
      );
    });
  });
});
