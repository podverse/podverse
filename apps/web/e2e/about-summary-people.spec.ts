import { expect, test } from '@playwright/test';

import {
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const CHANNEL_PEOPLE_URL = `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}?type=people`;
const EPISODE_PEOPLE_URL = `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}?type=people`;

test.describe('About and Summary people', () => {
  test('channel People tab shows seeded channel people', async ({ page }, testInfo) => {
    await page.goto(CHANNEL_PEOPLE_URL);
    await expect(page).toHaveURL(
      new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}.*type=people`)
    );

    const hostName = page.getByText('E2E Channel Host', { exact: true });
    await expect(hostName).toBeVisible();
    await captureVerifiedElement(page, testInfo, hostName, 'Channel People shows the seeded host');
    await capturePageLoad(page, testInfo, 'Channel People with people');
  });

  test('episode People tab shows seeded item people', async ({ page }, testInfo) => {
    await page.goto(EPISODE_PEOPLE_URL);
    await expect(page).toHaveURL(
      new RegExp(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}.*type=people`)
    );

    const guestName = page.getByText('E2E Episode Guest', { exact: true });
    await expect(guestName).toBeVisible();
    await captureVerifiedElement(
      page,
      testInfo,
      guestName,
      'Episode People shows the seeded guest'
    );
    await capturePageLoad(page, testInfo, 'Episode People with people');
  });
});
