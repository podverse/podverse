import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';
import {
  expectWebPushConfigured,
  mockAccountPushDevices,
  mockNotificationPreferences,
  readRequestPermissionCalls,
  stubBrowserNotificationPermission,
} from './helpers/webPushPermission';

const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const SIGN_IN_PUSH_DIALOG_NAME = 'Turn On Push Notifications on This Device?';

function signInPushDialog(page: Page) {
  return page.getByRole('dialog', { name: SIGN_IN_PUSH_DIALOG_NAME });
}

/**
 * The signed-in page keeps an account event stream open. A quiet EventSource lets
 * `networkidle` settle after the sign-in dialog's own requests finish.
 */
async function stubAccountEventStream(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class QuietEventSource {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 2;
      readyState = QuietEventSource.CONNECTING;
      onopen: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      constructor(_url: string) {
        queueMicrotask(() => {
          this.readyState = QuietEventSource.OPEN;
          this.onopen?.(new Event('open'));
        });
      }
      addEventListener(): void {
        // The stub delivers no events.
      }
      close(): void {
        this.readyState = QuietEventSource.CLOSED;
      }
    }
    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      writable: true,
      value: QuietEventSource,
    });
  });
}

async function readSignInPushPromptShownFlags(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) =>
      key.startsWith('notifications.sign_in_push_prompt_shown:')
    )
  );
}

async function openPodcastsReadyForSignIn(
  page: Page,
  params: {
    permission: 'default' | 'denied';
    pushEnabledCategories: readonly string[];
    otherBrowserWebPushDevices: number;
  }
): Promise<void> {
  await stubBrowserNotificationPermission(page, {
    permission: params.permission,
    requestResult: 'denied',
  });
  await stubAccountEventStream(page);
  await mockNotificationPreferences(page, {
    pushEnabledCategories: params.pushEnabledCategories,
  });
  await mockAccountPushDevices(page, {
    otherBrowserWebPushDevices: params.otherBrowserWebPushDevices,
    unifiedPushDevice: false,
  });
  await page.goto('/podcasts');
  await expect(page).toHaveURL(/\/podcasts\/?$/);
  await expect(
    page.locator('[data-appearance="web"]').getByRole('button', { name: 'Account' })
  ).toBeVisible();
  await expectWebPushConfigured(page);
}

async function signInThroughLoginModal(page: Page): Promise<void> {
  const chrome = page.locator('[data-appearance="web"]');
  await chrome.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Login' }).click();
  const dialog = page.getByRole('dialog', { name: 'Login' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Email or Username').fill(LOGIN_EMAIL);
  await dialog.getByLabel('Password').fill(LOGIN_PASSWORD);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v2/auth/login') && response.request().method() === 'POST'
  );
  const reloaded = page.waitForEvent('load');
  await dialog.getByRole('button', { name: 'Submit' }).click();
  const response = await loginResponse;
  expect(response.ok(), await response.text()).toBeTruthy();
  await reloaded;
  await expect(page).toHaveURL(/\/podcasts\/?$/);
  await expect(chrome.getByRole('button', { name: 'Account' })).toBeVisible();
}

async function signOutThroughAccountMenu(page: Page): Promise<void> {
  const chrome = page.locator('[data-appearance="web"]');
  await chrome.getByRole('button', { name: 'Account' }).click();
  const reloaded = page.waitForEvent('load');
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await reloaded;
  await expect(page).toHaveURL(/\/podcasts\/?$/);
  await expect(chrome.getByRole('button', { name: 'Account' })).toBeVisible();
  await chrome.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByRole('menuitem', { name: 'Login' })).toBeVisible();
}

async function expectSignInPushDialogAbsent(page: Page): Promise<void> {
  const chrome = page.locator('[data-appearance="web"]');
  await expect(page).toHaveURL(/\/podcasts\/?$/);
  await expect(chrome.getByRole('button', { name: 'Account' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(signInPushDialog(page)).toHaveCount(0);
}

test.describe('Sign-in push prompt', () => {
  test('When push is on for the account and another device has push, the first page after signing in asks once, and Enable Push asks the browser for permission.', async ({
    page,
  }, testInfo) => {
    await test.step('Open Podcasts signed out, with push on and another browser already registered.', async () => {
      await openPodcastsReadyForSignIn(page, {
        permission: 'default',
        pushEnabledCategories: ['new-content'],
        otherBrowserWebPushDevices: 1,
      });
    });

    await test.step('Sign in through the login modal.', async () => {
      await signInThroughLoginModal(page);
    });

    const dialog = signInPushDialog(page);
    await test.step('The first page after signing in asks once, with Enable Push and Not Now.', async () => {
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Enable Push' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Not Now' })).toBeVisible();
      await expect.poll(async () => readSignInPushPromptShownFlags(page)).toHaveLength(1);
      await capturePageLoad(
        page,
        testInfo,
        'The first page after signing in asks to turn on push for this browser.',
        dialog
      );
    });

    await test.step('Enable Push asks the browser for permission and closes the dialog.', async () => {
      await dialog.getByRole('button', { name: 'Enable Push' }).click();
      await expect(dialog).toHaveCount(0);
      expect(await readRequestPermissionCalls(page)).toBe(1);
    });

    await test.step('Reloading the signed-in page does not ask again.', async () => {
      await page.reload();
      await expectSignInPushDialogAbsent(page);
    });
  });

  test('Not Now closes the dialog without asking the browser, and signing in again does not ask again.', async ({
    page,
  }) => {
    await test.step('Open Podcasts signed out, with push on and another browser already registered.', async () => {
      await openPodcastsReadyForSignIn(page, {
        permission: 'default',
        pushEnabledCategories: ['new-content'],
        otherBrowserWebPushDevices: 1,
      });
    });

    await test.step('Sign in through the login modal.', async () => {
      await signInThroughLoginModal(page);
    });

    const dialog = signInPushDialog(page);
    await test.step('Not Now closes the dialog without asking the browser for permission.', async () => {
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Not Now' }).click();
      await expect(dialog).toHaveCount(0);
      expect(await readRequestPermissionCalls(page)).toBe(0);
    });

    await test.step('Signing out and signing in again does not ask again.', async () => {
      await signOutThroughAccountMenu(page);
      await signInThroughLoginModal(page);
      await expectSignInPushDialogAbsent(page);
    });
  });

  test('When the account has no push device anywhere, signing in does not ask and records nothing.', async ({
    page,
  }) => {
    await test.step('Open Podcasts signed out, with push on and no push device on the account.', async () => {
      await openPodcastsReadyForSignIn(page, {
        permission: 'default',
        pushEnabledCategories: ['new-content'],
        otherBrowserWebPushDevices: 0,
      });
    });

    await test.step('Signing in does not ask and records nothing.', async () => {
      await signInThroughLoginModal(page);
      await expectSignInPushDialogAbsent(page);
      expect(await readSignInPushPromptShownFlags(page)).toEqual([]);
    });
  });

  test('When no notification category has Push on, signing in does not ask.', async ({ page }) => {
    await test.step('Open Podcasts signed out, with every category Push off and another browser registered.', async () => {
      await openPodcastsReadyForSignIn(page, {
        permission: 'default',
        pushEnabledCategories: [],
        otherBrowserWebPushDevices: 1,
      });
    });

    await test.step('Signing in does not ask and records nothing.', async () => {
      await signInThroughLoginModal(page);
      await expectSignInPushDialogAbsent(page);
      expect(await readSignInPushPromptShownFlags(page)).toEqual([]);
    });
  });

  test('When this browser has blocked notifications, signing in does not ask.', async ({
    page,
  }) => {
    await test.step('Open Podcasts signed out, with notifications blocked, push on, and another browser registered.', async () => {
      await openPodcastsReadyForSignIn(page, {
        permission: 'denied',
        pushEnabledCategories: ['new-content'],
        otherBrowserWebPushDevices: 1,
      });
    });

    await test.step('Signing in does not ask and records nothing.', async () => {
      await signInThroughLoginModal(page);
      await expectSignInPushDialogAbsent(page);
      expect(await readSignInPushPromptShownFlags(page)).toEqual([]);
    });
  });
});
