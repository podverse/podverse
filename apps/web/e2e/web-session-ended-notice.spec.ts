import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  endOtherSessions,
  FIREFOX_WINDOWS_USER_AGENT,
  loginSessionsUser,
  newOtherDeviceRequest,
} from './helpers/accountSessions';
import { capturePageLoad } from './helpers/stepScreenshots';

async function expectSignedInNavbar(page: Page): Promise<void> {
  const chrome = page.locator('[data-appearance="web"]');
  await chrome.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByRole('menuitem', { name: 'Logout' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Login' })).toHaveCount(0);
}

async function expectSignedOutNavbar(page: Page): Promise<void> {
  const chrome = page.locator('[data-appearance="web"]');
  // The dialog covers the navbar, so the click goes to the account button itself.
  await chrome.getByRole('button', { name: 'Account' }).dispatchEvent('click');
  await expect(page.getByRole('menuitem', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Logout' })).toHaveCount(0);
}

test.describe('Web session ended notice', () => {
  test('A browser whose session was ended from another device says so after its next page load.', async ({
    context,
    page,
    playwright,
  }, testInfo) => {
    await test.step('Log in as the sessions user and open Podcasts signed in.', async () => {
      await loginSessionsUser(page.request);
      await endOtherSessions(page.request);
      await page.goto('/podcasts');
      await expect(page).toHaveURL(/\/podcasts\/?$/);
      await expectSignedInNavbar(page);
    });

    const otherDevice = await newOtherDeviceRequest(playwright, FIREFOX_WINDOWS_USER_AGENT);
    try {
      await test.step('End this browser session from another device.', async () => {
        await endOtherSessions(otherDevice);
      });

      await test.step('The next page load says this browser was signed out from another device.', async () => {
        // This response renders the sign-out checker, which reloads into the signed-out page.
        await page.reload({ waitUntil: 'commit' });
        const dialog = page.getByRole('dialog', { name: "You've Been Signed Out" });
        await expect(dialog).toBeVisible();
        await expect(page).toHaveURL(/\/podcasts\/?$/);
        await expect(
          dialog.getByText('You were signed out from another device.', { exact: true })
        ).toBeVisible();
        await capturePageLoad(
          page,
          testInfo,
          'The dialog says this browser was signed out from another device.',
          dialog
        );
        await expectSignedOutNavbar(page);
        const jwtCookies = (await context.cookies()).filter((cookie) => cookie.name === 'jwt');
        expect(jwtCookies).toEqual([]);
      });

      await test.step('Closing the dialog and reloading does not show it again.', async () => {
        const dialog = page.getByRole('dialog', { name: "You've Been Signed Out" });
        await dialog.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(dialog).toBeHidden();
        await page.reload();
        await expect(page).toHaveURL(/\/podcasts\/?$/);
        await expect(
          page.locator('[data-appearance="web"]').getByRole('button', { name: 'Account' })
        ).toBeVisible();
        await expect(page.getByRole('dialog', { name: "You've Been Signed Out" })).toHaveCount(0);
      });
    } finally {
      await otherDevice.dispose();
    }
  });

  test('An open page signs out and says why when its next request from the browser is refused.', async ({
    page,
    playwright,
  }, testInfo) => {
    await test.step('Log in as the sessions user and open Signed-In Devices.', async () => {
      await loginSessionsUser(page.request);
      await endOtherSessions(page.request);
      // The account event stream would sign this page out before the tab change. This test
      // is the refused request, so the stream stays closed.
      await page.route('**/api/v2/account/events**', (route) => route.fulfill({ status: 204 }));
      await page.goto('/settings?tab=account');
      await expect(page).toHaveURL(/\/settings\?tab=account/);
      await expect(page.getByRole('heading', { name: 'Signed-In Devices' })).toBeVisible();
      await expect(page.getByRole('list', { name: 'Signed-In Devices' })).toBeVisible();
    });

    const otherDevice = await newOtherDeviceRequest(playwright, FIREFOX_WINDOWS_USER_AGENT);
    try {
      await test.step('End this browser session from another device.', async () => {
        await endOtherSessions(otherDevice);
      });

      await test.step('The next request from this open page signs the browser out and says why.', async () => {
        const settingsTabs = page.locator('header');
        const dialog = page.getByRole('dialog', { name: "You've Been Signed Out" });
        // The tab change navigates, the refused session reloads the page, and the dialog
        // opens on that load. dispatchEvent runs the tab click without waiting out that reload.
        await settingsTabs
          .getByRole('button', { name: 'General', exact: true })
          .dispatchEvent('click');
        await expect(dialog).toBeVisible();
        await expect(page).toHaveURL(/\/settings\/?$/);
        await expect(page.locator('#settings_preferred_media_type_selector')).toBeVisible();
        await expect(
          dialog.getByText('You were signed out from another device.', { exact: true })
        ).toBeVisible();
        await capturePageLoad(
          page,
          testInfo,
          'The open page says this browser was signed out from another device.',
          dialog
        );
        await expectSignedOutNavbar(page);
      });
    } finally {
      await otherDevice.dispose();
    }
  });

  test('An open page signs out and says why as soon as another device ends its session.', async ({
    page,
    playwright,
  }, testInfo) => {
    // The dialog wait is 15 seconds, past the 10-second default.
    test.setTimeout(30_000);

    await test.step('Log in as the sessions user and open Signed-In Devices with the stream open.', async () => {
      await loginSessionsUser(page.request);
      await endOtherSessions(page.request);
      const streamOpened = page.waitForResponse(
        (response) => response.url().includes('/account/events') && response.status() === 200
      );
      await page.goto('/settings?tab=account');
      await streamOpened;
      await expect(page).toHaveURL(/\/settings\?tab=account/);
      await expect(page.getByRole('heading', { name: 'Signed-In Devices' })).toBeVisible();
    });

    const otherDevice = await newOtherDeviceRequest(playwright, FIREFOX_WINDOWS_USER_AGENT);
    try {
      await test.step('End this browser session from another device without touching this page.', async () => {
        await endOtherSessions(otherDevice);
      });

      await test.step('This open page signs out and says why as soon as the session ends.', async () => {
        const dialog = page.getByRole('dialog', { name: "You've Been Signed Out" });
        // Shorter than the 60-second unread-count poll, so only the stream event can pass this.
        await expect(dialog).toBeVisible({ timeout: 15_000 });
        await expect(page).toHaveURL(/\/settings\?tab=account/);
        await expect(
          dialog.getByText('You were signed out from another device.', { exact: true })
        ).toBeVisible();
        await capturePageLoad(
          page,
          testInfo,
          'The open page says this browser was signed out from another device as soon as another device ended its session.',
          dialog
        );
        await expectSignedOutNavbar(page);
      });
    } finally {
      await otherDevice.dispose();
    }
  });
});
