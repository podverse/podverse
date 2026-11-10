import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const WRONG_PASSWORD = 'not-the-password';

async function openLoginDialog(page: Page) {
  const chrome = page.locator('[data-appearance="web"]');
  await chrome.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Login' }).click();
  const dialog = page.getByRole('dialog', { name: 'Login' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Login invalid password', () => {
  test('When a visitor submits the wrong password, the login dialog shows a bold danger error.', async ({
    page,
  }, testInfo) => {
    await test.step('Open the Subscribed page signed out.', async () => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.locator('[data-appearance="web"]').getByRole('button', { name: 'Account' })
      ).toBeVisible();
      await capturePageLoad(
        page,
        testInfo,
        'Signed-out Subscribed page is ready for login.',
        page.locator('[data-appearance="web"]').getByRole('button', { name: 'Account' })
      );
    });

    const dialog = await test.step('Open the login dialog from the Account menu.', async () => {
      const loginDialog = await openLoginDialog(page);
      await capturePageLoad(page, testInfo, 'Login dialog is open.', loginDialog);
      return loginDialog;
    });

    await test.step('Submitting a wrong password shows a bold danger error.', async () => {
      await dialog.getByLabel('Email or Username').fill('e2e-user@example.com');
      await dialog.getByLabel('Password').fill(WRONG_PASSWORD);

      const loginResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v2/auth/login') && response.request().method() === 'POST'
      );
      await actionAndCapture(
        page,
        testInfo,
        'Wrong password shows Invalid Email or Password in bold danger text.',
        async () => {
          await dialog.getByRole('button', { name: 'Submit' }).click();
          const response = await loginResponse;
          expect(response.status()).toBe(401);
          const error = dialog.getByRole('alert');
          await expect(error).toBeVisible();
          await expect(error).toHaveText('Invalid Email or Password.');
          await expect(error).toHaveCSS('font-weight', '700');
          await expect
            .poll(async () => {
              return error.evaluate((element) => {
                const computed = getComputedStyle(element).color.trim().toLowerCase();
                const danger = getComputedStyle(document.documentElement)
                  .getPropertyValue('--text-color-danger')
                  .trim()
                  .toLowerCase();
                const cleaned = danger.replace('#', '');
                if (cleaned.length !== 6) {
                  return `unexpected-danger:${danger}`;
                }
                const r = Number.parseInt(cleaned.slice(0, 2), 16);
                const g = Number.parseInt(cleaned.slice(2, 4), 16);
                const b = Number.parseInt(cleaned.slice(4, 6), 16);
                const expectedRgb = `rgb(${r}, ${g}, ${b})`;
                return computed === expectedRgb || computed === danger ? 'match' : computed;
              });
            })
            .toBe('match');
        },
        dialog.getByRole('alert')
      );
    });
  });
});
