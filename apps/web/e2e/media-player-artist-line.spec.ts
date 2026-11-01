import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearSeededPodcastQueueResources } from './helpers/mediaPlayerAssertions';
import { E2E_MUSIC_CHANNEL_ID_TEXT, E2E_MUSIC_TRACK_ONE_ID_TEXT } from './helpers/seedConstants';
import { capturePageLoad, captureVerifiedElement } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Player artist line', () => {
  test.beforeEach(async ({ page }) => {
    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);
  });

  test('When a directory album track is playing, the player bar shows the artist and the album, and the full-size player opens the artist page.', async ({
    page,
  }, testInfo) => {
    await page.goto(`/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
    await expect(page.getByRole('heading', { name: 'E2E Music Track One' })).toBeVisible();

    await page.locator('main').getByRole('button', { name: 'Play' }).first().click();

    await expect(
      page
        .locator('#media-player')
        .getByText('E2E Music Artist · E2E Music Album', { exact: true })
        .first()
    ).toBeVisible();

    await page.locator('#media-player').getByRole('button').first().click();
    const dialog = page.getByRole('dialog', { name: 'Fullscreen Media Player' });
    await expect(dialog).toBeVisible();

    const artistLink = dialog.getByRole('link', { name: 'E2E Music Artist', exact: true });
    await expect(artistLink).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'E2E Music Album', exact: true })).toBeVisible();

    await captureVerifiedElement(
      page,
      testInfo,
      artistLink,
      'The full-size player shows the verified artist between the track and the album.'
    );

    await artistLink.click();
    await expect(page).toHaveURL(new RegExp(`/artist/${E2E_MUSIC_CHANNEL_ID_TEXT}$`));
    const artistHeading = page.getByRole('heading', { name: 'E2E Music Artist', exact: true });
    await expect(artistHeading).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Fullscreen Media Player' })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The artist page opened from the full-size player.',
      artistHeading
    );
  });
});
