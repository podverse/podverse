import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const UNDECIDED_EMAIL = 'e2e-popularity-undecided@example.com';
const DECIDED_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function loginViaApi(page: Page, email: string): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Popularity Tracking consent', () => {
  test('When a logged-in account has never decided, the gate blocks the rest of the app.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page, UNDECIDED_EMAIL);
    await page.goto('/');

    await expect(page).toHaveURL(/\/popularity-tracking/);
    await expect(page.getByRole('heading', { name: 'Popularity Tracking' })).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'After login, an undecided account lands on the Popularity Tracking gate.',
      page.getByRole('heading', { name: 'Popularity Tracking' })
    );

    await actionAndCapture(
      page,
      testInfo,
      'Learn more reveals the detailed agreement on this page.',
      async () => {
        await expect(page.getByText('includes you in unique-listener rankings')).toBeVisible();
        await page.getByRole('button', { name: 'Learn more' }).click();
        await expect(page).toHaveURL(/\/popularity-tracking/);
        await expect(page.getByRole('heading', { name: 'What we do not do' })).toBeVisible();
      },
      page.getByRole('heading', { name: 'What we do not do' })
    );

    await actionAndCapture(
      page,
      testInfo,
      'Yes records accept and leaves the Popularity Tracking gate.',
      async () => {
        await page.getByRole('button', { name: 'Yes, track me' }).click();
        await expect(page).not.toHaveURL(/popularity-tracking/);
      }
    );
  });

  test('When the account already accepted the current version, settings show that they already agreed.', async ({
    page,
  }, testInfo) => {
    await loginViaApi(page, DECIDED_EMAIL);
    await page.goto('/settings?tab=account');

    await expect(page.getByRole('heading', { name: 'Popularity Tracking' })).toBeVisible();
    await expect(page.getByText('You already agreed to this version.')).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Account settings show the Popularity Tracking agreement and that the current version is already accepted.',
      page.getByText('You already agreed to this version.')
    );
  });
});
