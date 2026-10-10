import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_CONFIGURED_TERMS_VERSION,
  E2E_STALE_TERMS_EMAIL,
  E2E_STALE_TERMS_PASSWORD,
} from './helpers/legalConsent';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const TERMS_SCREEN_NAME = 'Terms of Service';
const TERMS_CHECKBOX_NAME = 'I have read and agree to the Terms of Service.';
const TERMS_DATE = `Valid since ${E2E_CONFIGURED_TERMS_VERSION}`;

async function loginStaleTermsUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: E2E_STALE_TERMS_EMAIL, password: E2E_STALE_TERMS_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Terms version acceptance', () => {
  test('When an account has an outdated terms acceptance, the agreement screen blocks the app until the visitor accepts.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);

    await test.step('Log in with the seeded stale-terms account', async () => {
      await loginStaleTermsUser(page);
    });

    await test.step('Open the home page and verify the terms screen replaces the app', async () => {
      await page.goto('/');
      await expect(page).toHaveURL('/');

      const termsScreen = page.getByRole('main', { name: TERMS_SCREEN_NAME });
      await expect(termsScreen).toBeVisible();
      await expect(termsScreen.getByText(TERMS_DATE)).toBeVisible();
      await expect(termsScreen.getByRole('button', { name: 'Accept' })).toBeDisabled();

      await termsScreen.getByText('Full Terms').click();
      await expect(termsScreen.getByRole('heading', { name: 'The Service' })).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The Terms of Service screen blocks the app until the visitor accepts.',
        termsScreen
      );
    });

    await test.step('Reject the terms and open Account Access while still signed in', async () => {
      await actionAndCapture(
        page,
        testInfo,
        'Rejecting the Terms of Service opens Account Access without signing out.',
        async () => {
          await page.getByRole('button', { name: 'Reject' }).click();
          await expect(page).toHaveURL('/account-access');
          const accessScreen = page.getByRole('main', { name: 'Account Access' });
          await expect(accessScreen).toBeVisible();
          await expect(accessScreen.getByRole('button', { name: 'Review Terms of Service' })).toBeVisible();
          await expect(accessScreen.getByRole('button', { name: 'Download My Data' })).toBeVisible();
          const meResponse = await page.request.get('http://localhost:4030/api/v2/auth/me');
          expect(meResponse.ok(), await meResponse.text()).toBeTruthy();
        },
        page.getByRole('main', { name: 'Account Access' })
      );
    });

    await test.step('Review Terms returns to the agreement gate, then accept unlocks the app', async () => {
      await actionAndCapture(
        page,
        testInfo,
        'Review Terms of Service returns to the gate; accepting unlocks the app.',
        async () => {
          await page.getByRole('button', { name: 'Review Terms of Service' }).click();
          const termsScreen = page.getByRole('main', { name: TERMS_SCREEN_NAME });
          await expect(termsScreen).toBeVisible();

          await page.getByRole('checkbox', { name: TERMS_CHECKBOX_NAME }).check();
          await page.getByRole('button', { name: 'Accept' }).click();
          await expect(page.getByRole('main', { name: TERMS_SCREEN_NAME })).toHaveCount(0);
          await page.goto('/settings?tab=account');
          await page.getByRole('link', { name: TERMS_DATE }).click();
          await expect(page).toHaveURL('/terms');
          await expect(page.getByRole('heading', { name: 'Terms', level: 1 })).toBeVisible();
          await expect(page.getByText(TERMS_DATE)).toBeVisible();
          await expect(page.getByRole('heading', { name: 'The Service' })).toBeVisible();
        },
        page.getByRole('heading', { name: 'Terms', level: 1 })
      );
    });

    await test.step('Verify auth/me reflects the current terms version', async () => {
      const meResponse = await page.request.get('http://localhost:4030/api/v2/auth/me');
      expect(meResponse.ok(), await meResponse.text()).toBeTruthy();
      const meBody = (await meResponse.json()) as {
        account_terms_acceptance?: { terms_version?: string };
      };
      expect(meBody.account_terms_acceptance?.terms_version).toBe(E2E_CONFIGURED_TERMS_VERSION);
    });
  });
});
