import { expect, test } from '@playwright/test';

import {
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const CHANNEL_ABOUT_URL = `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}?type=about`;
const EPISODE_SUMMARY_URL = `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}?type=summary`;

test.describe('About and Summary people', () => {
  test('channel About shows seeded channel people', async ({ page }, testInfo) => {
    await page.goto(CHANNEL_ABOUT_URL);
    await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}.*type=about`));

    const hostName = page.getByText('E2E Channel Host', { exact: true });
    await expect(hostName).toBeVisible();
    await captureVerifiedElement(page, testInfo, hostName, 'Channel About shows the seeded host');
    await capturePageLoad(page, testInfo, 'Channel About with people');
  });

  test('episode Summary shows seeded item people', async ({ page }, testInfo) => {
    await page.goto(EPISODE_SUMMARY_URL);
    await expect(page).toHaveURL(
      new RegExp(`/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}.*type=summary`)
    );

    const guestName = page.getByText('E2E Episode Guest', { exact: true });
    await expect(guestName).toBeVisible();
    await captureVerifiedElement(
      page,
      testInfo,
      guestName,
      'Episode Summary shows the seeded guest'
    );
    await capturePageLoad(page, testInfo, 'Episode Summary with people');
  });
});
