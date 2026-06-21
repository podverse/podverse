import { expect, test } from '@playwright/test';

import {
  E2E_MUSIC_ALBUM_ID_TEXT,
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Medium-correct canonical routing', () => {
  test('A music album requested on the podcast path redirects to the album path.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/podcast/${E2E_MUSIC_ALBUM_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/album/${E2E_MUSIC_ALBUM_ID_TEXT}$`));
    await capturePageLoad(
      page,
      testInfo,
      'The music album loads on the album path after the podcast path redirects.'
    );
  });

  test('A podcast requested on the album path redirects to the podcast path.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/album/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}$`));
    await capturePageLoad(
      page,
      testInfo,
      'The podcast loads on the podcast path after the album path redirects.'
    );
  });

  test('A music track requested on the episode path redirects to the track path.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/episode/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}$`));
    await capturePageLoad(
      page,
      testInfo,
      'The music track loads on the track path after the episode path redirects.'
    );
  });

  test('A podcast episode requested on the track path redirects to the episode path.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/track/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
    await expect(page).toHaveURL(new RegExp(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}$`));
    await capturePageLoad(
      page,
      testInfo,
      'The podcast episode loads on the episode path after the track path redirects.'
    );
  });
});
