import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { E2E_PODCAST_CHANNEL_ID_TEXT } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

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

test.describe('Podcast channel RSS parse status', () => {
  test('When a logged-in user opens podcast settings, RSS parse status lines show seeded success and failure timestamps.', async ({
    page,
  }, testInfo) => {
    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Open the podcast channel settings tab and verify parse status lines.', async () => {
      await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}?type=settings`);
      await expect(page).toHaveURL(
        new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}.*type=settings`)
      );
      await expect(page.getByRole('heading', { name: 'RSS Feed' })).toBeVisible();
      await expect(page.getByText(/Last Parsed:/)).toBeVisible();
      await expect(page.getByText(/Last failed parse:/)).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The podcast settings tab shows RSS parse success and failure status lines.',
        page.getByRole('heading', { name: 'RSS Feed' })
      );
    });
  });
});
