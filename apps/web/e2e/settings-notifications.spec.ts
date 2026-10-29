import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';
import {
  expectWebPushConfigured,
  mockAccountPushDevices,
  mockNotificationPreferences,
  readRequestPermissionCalls,
  stubBrowserNotificationPermission,
} from './helpers/webPushPermission';

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
  return page.getByRole('switch', { name: 'Enable Notifications When I Subscribe' });
}

function typeDefaultSwitch(page: Page, label: string): Locator {
  return page.getByRole('switch', { name: label });
}

/** Dismiss the apply-to-existing modal when the account has followed podcasts (count > 0). */
async function dismissApplyDialogIfOpen(page: Page): Promise<void> {
  const onlyNew = page.getByRole('button', { name: 'Only New Subscriptions' });
  const onlyNewType = page.getByRole('button', { name: 'Only New' });
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
    const newItem = typeDefaultSwitch(page, 'New Item');
    const livestreamScheduled = typeDefaultSwitch(page, 'Livestream Scheduled');
    const livestreamStarted = typeDefaultSwitch(page, 'Livestream Started');

    await test.step('Open the notifications settings tab and verify subscribe-default controls.', async () => {
      await page.goto('/settings?tab=notifications');
      await expect(page).toHaveURL(/\/settings\?tab=notifications/);
      await expect(page.getByRole('heading', { name: 'When I Subscribe' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Notification Types' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Media Notifications' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'System Notifications' })).toBeVisible();
      await expect(autoEnable).toBeVisible();
      await expect(newItem).toBeVisible();
      await expect(livestreamScheduled).toBeVisible();
      await expect(livestreamStarted).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Unified Push' })).toHaveCount(0);
      await expect(page.getByRole('switch', { name: 'New Content' })).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Livestream' })).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Product Updates' })).toBeVisible();
      const pushPreferences = page.getByRole('switch', { name: /Push/ });
      await expect(pushPreferences.first()).toBeVisible();
      const pushCount = await pushPreferences.count();
      // Media categories and locked system categories show Push; Product Updates stays off by
      // default so its Push row stays hidden until the base switch is on.
      expect(pushCount).toBeGreaterThanOrEqual(5);
      await expect(page.getByRole('switch', { name: 'Banner' })).toHaveCount(0);
      await expect(page.getByRole('switch', { name: 'In-App' })).toHaveCount(0);
      await expect(page.getByText('Enable Web Push or Unified Push first.')).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'The notifications tab shows category switches with Push revealed when a category is on.',
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

const BANNER_MESSAGE =
  "Push notifications are turned on for your account, but this device doesn't have permission to show them.";

type DevicePushBannerSetup = {
  otherBrowserWebPushDevices: number;
  permission: 'default' | 'denied';
  pushEnabledCategories: readonly string[];
  requestResult: 'default' | 'denied';
  unifiedPushDevice: boolean;
};

/**
 * The signed-in account event stream stays open for the session. A finished 204 lets the page
 * reach network idle after the banner's device and preference checks.
 */
async function closeAccountEventStream(page: Page): Promise<void> {
  await page.route('**/api/v2/account/events**', (route) => route.fulfill({ status: 204 }));
}

async function openNotificationsTab(page: Page, setup: DevicePushBannerSetup): Promise<Locator> {
  await loginSeedUser(page);
  await stubBrowserNotificationPermission(page, {
    permission: setup.permission,
    requestResult: setup.requestResult,
  });
  await mockNotificationPreferences(page, {
    pushEnabledCategories: setup.pushEnabledCategories,
  });
  await mockAccountPushDevices(page, {
    otherBrowserWebPushDevices: setup.otherBrowserWebPushDevices,
    unifiedPushDevice: setup.unifiedPushDevice,
  });
  await closeAccountEventStream(page);
  await page.goto('/settings?tab=notifications');
  await expect(page).toHaveURL(/\/settings\?tab=notifications/);
  await expectWebPushConfigured(page);
  const whenISubscribe = page.getByRole('heading', { name: 'When I Subscribe' });
  await expect(whenISubscribe).toBeVisible();
  return whenISubscribe;
}

test.describe('Settings: device push banner', () => {
  test('When the account has a push device elsewhere, push is on, and this browser has not allowed notifications, a warning banner sits at the top of the notifications tab and its button asks the browser.', async ({
    page,
  }, testInfo) => {
    const whenISubscribe = await openNotificationsTab(page, {
      otherBrowserWebPushDevices: 1,
      permission: 'default',
      pushEnabledCategories: ['new-content'],
      requestResult: 'denied',
      unifiedPushDevice: false,
    });
    const banner = page.getByTestId('settings-notifications-device-push-banner');

    await expect(banner).toBeVisible();
    await expect(banner).toContainText(BANNER_MESSAGE);
    const bannerBox = await banner.boundingBox();
    const headingBox = await whenISubscribe.boundingBox();
    expect(bannerBox, 'The device push banner has a layout box.').not.toBeNull();
    expect(headingBox, 'The When I Subscribe heading has a layout box.').not.toBeNull();
    if (bannerBox !== null && headingBox !== null) {
      expect(bannerBox.y).toBeLessThan(headingBox.y);
    }

    await capturePageLoad(
      page,
      testInfo,
      'A warning banner sits above When I Subscribe when this browser has not allowed notifications.',
      banner
    );

    await banner.getByRole('button', { name: 'Allow on This Device' }).click();
    await expect.poll(() => readRequestPermissionCalls(page)).toBe(1);
  });

  test("When this browser has blocked notifications, the banner's button explains how to allow them in the browser.", async ({
    page,
  }, testInfo) => {
    await openNotificationsTab(page, {
      otherBrowserWebPushDevices: 1,
      permission: 'denied',
      pushEnabledCategories: ['new-content'],
      requestResult: 'denied',
      unifiedPushDevice: false,
    });
    const banner = page.getByTestId('settings-notifications-device-push-banner');
    const dialog = page.getByRole('dialog', { name: 'Notifications Are Blocked' });

    await expect(banner).toBeVisible();

    await actionAndCapture(
      page,
      testInfo,
      'Allow on This Device explains how to unblock notifications in the browser.',
      async () => {
        await banner.getByRole('button', { name: 'Allow on This Device' }).click();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(
          'This browser is blocking notifications for this site.'
        );
      },
      dialog
    );

    expect(await readRequestPermissionCalls(page)).toBe(0);

    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(banner).toBeVisible();
  });

  test('When the account has no push device anywhere, the banner does not appear, even with push on.', async ({
    page,
  }) => {
    await openNotificationsTab(page, {
      otherBrowserWebPushDevices: 0,
      permission: 'default',
      pushEnabledCategories: ['new-content'],
      requestResult: 'denied',
      unifiedPushDevice: false,
    });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('settings-notifications-device-push-banner')).toHaveCount(0);
  });

  test('When no notification category has Push on, the banner does not appear.', async ({
    page,
  }) => {
    await openNotificationsTab(page, {
      otherBrowserWebPushDevices: 1,
      permission: 'default',
      pushEnabledCategories: [],
      requestResult: 'denied',
      unifiedPushDevice: false,
    });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('settings-notifications-device-push-banner')).toHaveCount(0);
  });

  test('When the account receives push through Unified Push, the banner does not appear.', async ({
    page,
  }) => {
    await openNotificationsTab(page, {
      otherBrowserWebPushDevices: 0,
      permission: 'default',
      pushEnabledCategories: ['new-content'],
      requestResult: 'denied',
      unifiedPushDevice: true,
    });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('settings-notifications-device-push-banner')).toHaveCount(0);
  });
});
