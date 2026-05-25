import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { E2E_SET_PASSWORD_INVITE_TOKEN } from './helpers/setPasswordInvite';
import { capturePageLoad } from './helpers/stepScreenshots';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';

async function openSetPasswordInvite(page: Page): Promise<void> {
  await page.goto(`/set-password?token=${encodeURIComponent(E2E_SET_PASSWORD_INVITE_TOKEN)}`);
  await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
}

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Set-password invite when another session is active', () => {
  test('When a visitor opens an invite link without a session, they see the set-password form and no other-session banner.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);

    await test.step('Open the invite URL without logging in', async () => {
      await openSetPasswordInvite(page);
      await expect(page).toHaveURL(/\/set-password\?token=/);
      await expect(page.getByRole('heading', { name: 'Set Password' })).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The set-password form is visible for an unauthenticated invite visitor.',
        page.getByRole('heading', { name: 'Set Password' })
      );
    });

    await test.step('The session banner and its actions are not shown', async () => {
      await expect(page.getByRole('button', { name: 'Sign out and continue' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Continue without signing out' })).toHaveCount(
        0
      );
      await expect(page.getByText(/You are signed in as/i)).toHaveCount(0);
    });

    await test.step('Password fields are available', async () => {
      await expect(page.getByPlaceholder('Password')).toHaveCount(2);

      await capturePageLoad(
        page,
        testInfo,
        'Password fields are available and no other-session banner is shown.',
        page.getByPlaceholder('Password').first()
      );
    });
  });

  test('When a logged-in user opens an invite link, they see the other-session banner and both actions.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);

    await test.step('Sign in as the seeded primary user', async () => {
      await loginSeedUser(page);
    });

    await test.step('Open the invite URL', async () => {
      await openSetPasswordInvite(page);
      await expect(page.getByRole('heading', { name: 'Set Password' })).toBeVisible();
    });

    await test.step('The banner explains the situation and offers dismiss and sign-out', async () => {
      await expect(page.getByText(/You are signed in as .*e2e-user@example\.com/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign out and continue' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Continue without signing out' })
      ).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The other-session banner explains the situation and offers both actions.',
        page.getByText(/You are signed in as .*e2e-user@example\.com/)
      );
    });
  });

  test('When they choose Continue without signing out, the banner hides but the form stays.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);

    await loginSeedUser(page);
    await openSetPasswordInvite(page);

    await test.step('Dismiss the banner', async () => {
      await page.getByRole('button', { name: 'Continue without signing out' }).click();
    });

    await test.step('Banner copy is gone and the page is still set-password', async () => {
      await expect(page.getByText(/You are signed in as/i)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Sign out and continue' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Set Password' })).toBeVisible();
      await expect(page.getByPlaceholder('Password')).toHaveCount(2);

      await capturePageLoad(
        page,
        testInfo,
        'After dismissing the banner, the set-password form remains visible.',
        page.getByRole('heading', { name: 'Set Password' })
      );
    });
  });

  test('When they choose Sign out and continue, they return to the same invite URL without the banner.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await loginSeedUser(page);
    await openSetPasswordInvite(page);

    await test.step('Sign out and reload the invite URL', async () => {
      await page.getByRole('button', { name: 'Sign out and continue' }).click();
      await page.waitForURL(
        (url) =>
          url.pathname.endsWith('/set-password') &&
          url.searchParams.get('token') === E2E_SET_PASSWORD_INVITE_TOKEN
      );
    });

    await test.step('No session banner after logout', async () => {
      await expect(page.getByText(/You are signed in as/i)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Sign out and continue' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Set Password' })).toBeVisible();
      await expect(page.getByPlaceholder('Password')).toHaveCount(2);

      await capturePageLoad(
        page,
        testInfo,
        'After sign-out and continue, the invite URL shows the form without a session banner.',
        page.getByRole('heading', { name: 'Set Password' })
      );
    });
  });
});
