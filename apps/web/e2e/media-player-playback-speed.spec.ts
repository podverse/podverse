import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearSeededPodcastQueueResources,
  expectPersistentPlayerPlaying,
  openEpisodeAndPlay,
} from './helpers/mediaPlayerAssertions';
import { E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const EPISODE_TITLE = 'E2E Podcast No Stored Position';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Media player playback speed', () => {
  test('More Options opens a speed submenu and applying 1.25x updates the audio rate', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);

    await openEpisodeAndPlay(page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT, EPISODE_TITLE);
    await expectPersistentPlayerPlaying(page, true);

    await page.locator('aside#media-player button[aria-label="More Options"]:visible').click();
    await page.getByRole('menuitem', { name: /^Playback Speed:/ }).click();
    await page.getByRole('menuitem', { name: '1.25x' }).click();

    await expect
      .poll(async () => {
        return page
          .locator('audio')
          .first()
          .evaluate((el) => {
            if (!(el instanceof HTMLAudioElement)) {
              return Number.NaN;
            }
            return el.playbackRate;
          });
      })
      .toBe(1.25);

    await page.locator('aside#media-player button[aria-label="More Options"]:visible').click();
    await expect(page.getByRole('menuitem', { name: 'Playback Speed: 1.25x' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The media player More menu shows Playback Speed at 1.25x after selecting that rate from the submenu.'
    );
  });
});
