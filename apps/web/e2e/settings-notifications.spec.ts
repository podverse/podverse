import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function autoEnableSwitch(page: Page): Locator {
  return page.getByRole('switch', { name: 'Enable notifications when I subscribe' });
}

function typeDefaultSwitch(page: Page, label: string): Locator {
  return page.getByRole('switch', { name: label });
}

/** Dismiss the apply-to-existing modal when the account has followed podcasts (count > 0). */
async function dismissApplyDialogIfOpen(page: Page): Promise<void> {
  const onlyNew = page.getByRole('button', { name: 'Only new subscriptions' });
  const onlyNewType = page.getByRole('button', { name: 'Only new' });
  if (await onlyNew.isVisible().catch(() => false)) {
    await onlyNew.click();
    return;
  }
  if (await onlyNewType.isVisible().catch(() => false)) {
    await onlyNewType.click();
  }
}

test.describe('Settings: notification subscribe defaults', () => {
  test('When an unauthenticated user opens the notifications settings tab, they are redirected to the general settings page.', async ({
    page,
  }, testInfo) => {
    await page.goto('/settings?tab=notifications');
    await expect(page).toHaveURL(/\/settings$/);
    const preferredMediaType = page.locator('#settings_preferred_media_type_selector');
    await expect(preferredMediaType).toBeVisible();
    await expect(autoEnableSwitch(page)).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The unsigned visitor lands on General settings instead of the notifications tab.',
      preferredMediaType
    );
  });

  test('A logged-in user can see subscribe notification defaults and persist the auto-enable switch.', async ({
    page,
  }, testInfo) => {
    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    const autoEnable = autoEnableSwitch(page);
    const newItem = typeDefaultSwitch(page, 'New item');
    const livestreamScheduled = typeDefaultSwitch(page, 'Livestream scheduled');
    const livestreamStarted = typeDefaultSwitch(page, 'Livestream started');

    await test.step('Open the notifications settings tab and verify subscribe-default controls.', async () => {
      await page.goto('/settings?tab=notifications');
      await expect(page).toHaveURL(/\/settings\?tab=notifications/);
      await expect(page.getByRole('heading', { name: 'Notification types' })).toBeVisible();
      await expect(autoEnable).toBeVisible();
      await expect(newItem).toBeVisible();
      await expect(livestreamScheduled).toBeVisible();
      await expect(livestreamStarted).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The notifications tab shows auto-enable on subscribe and the three type defaults.',
        autoEnable
      );
    });

    await actionAndCapture(
      page,
      testInfo,
      'Turning auto-enable on persists after a reload.',
      async () => {
        if ((await autoEnable.getAttribute('aria-checked')) !== 'true') {
          await autoEnable.click();
          await dismissApplyDialogIfOpen(page);
        }
        await expect(autoEnable).toHaveAttribute('aria-checked', 'true');
        await page.reload();
        await expect(page).toHaveURL(/\/settings\?tab=notifications/);
        await expect(autoEnable).toHaveAttribute('aria-checked', 'true');
      },
      autoEnable
    );

    await actionAndCapture(
      page,
      testInfo,
      'Turning auto-enable off restores the default and persists after a reload.',
      async () => {
        await autoEnable.click();
        await dismissApplyDialogIfOpen(page);
        await expect(autoEnable).toHaveAttribute('aria-checked', 'false');
        await page.reload();
        await expect(page).toHaveURL(/\/settings\?tab=notifications/);
        await expect(autoEnable).toHaveAttribute('aria-checked', 'false');
      },
      autoEnable
    );
  });
});
