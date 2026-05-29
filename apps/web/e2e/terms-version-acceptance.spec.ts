import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_CONFIGURED_TERMS_VERSION,
  E2E_STALE_TERMS_EMAIL,
  E2E_STALE_TERMS_PASSWORD,
} from './helpers/legalConsent';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';

async function loginStaleTermsUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: E2E_STALE_TERMS_EMAIL, password: E2E_STALE_TERMS_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

test.describe('Terms version acceptance', () => {
  test('When an account has an outdated terms acceptance, login shows a blocking modal until the visitor accepts.', async ({
    page,
  }, testInfo) => {
    test.setTimeout(30_000);

    await test.step('Log in with the seeded stale-terms account', async () => {
      await loginStaleTermsUser(page);
    });

    await test.step('Open the home page and verify the blocking terms modal is visible', async () => {
      await page.goto('/');
      await expect(page).toHaveURL('/');

      const termsModal = page.getByRole('dialog', { name: 'Updated Terms of Service' });
      await expect(termsModal).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The updated Terms of Service modal blocks the app until the visitor accepts.',
        termsModal
      );
    });

    await test.step('Accept the updated terms and confirm the modal closes', async () => {
      await actionAndCapture(
        page,
        testInfo,
        'After accepting the updated terms, the modal closes and navigation is available again.',
        async () => {
          await page
            .getByRole('checkbox', {
              name: 'I have read and agree to the updated Terms of Service',
            })
            .check();
          await page.getByRole('button', { name: 'Continue' }).click();
          await expect(page.getByRole('dialog', { name: 'Updated Terms of Service' })).toHaveCount(
            0
          );
          await page.goto('/terms');
          await expect(page).toHaveURL('/terms');
          await expect(page.getByRole('heading', { name: 'Terms', level: 1 })).toBeVisible();
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
