import type { Locator, Page, Request } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  SIGN_IN_PUSH_PROMPT_SHOWN_VALUE,
  getSignInPushPromptShownStorageKey,
} from '@podverse/helpers';

import { E2E_PODCAST_CHANNEL_ID_TEXT } from './helpers/seedConstants';
import { actionAndCapture } from './helpers/stepScreenshots';
import {
  expectWebPushConfigured,
  mockAccountPushDevices,
  readRequestPermissionCalls,
  stubBrowserNotificationPermission,
} from './helpers/webPushPermission';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const API_ME_URL = 'http://localhost:4030/api/v2/auth/me';
const API_CHANNEL_NOTIFICATION_URL = `http://localhost:4030/api/v2/account/notification/channel/${E2E_PODCAST_CHANNEL_ID_TEXT}`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const ENABLE_BELL_NAME = 'Enable Notifications for This Podcast';

const isChannelCreateRequest = (request: Request): boolean =>
  request.method() === 'POST' && request.url().endsWith('/api/v2/account/notification/channel');

const readAccountIdText = (body: unknown): string => {
  if (typeof body !== 'object' || body === null) {
    throw new Error('auth/me did not include id_text');
  }
  const idText = Reflect.get(body, 'id_text');
  if (typeof idText !== 'string' || idText.length === 0) {
    throw new Error('auth/me did not include id_text');
  }
  return idText;
};

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

async function turnPodcastNotificationsOff(page: Page): Promise<void> {
  await page.request.delete(API_CHANNEL_NOTIFICATION_URL);
}

function trackChannelCreateRequests(page: Page): Request[] {
  const channelCreateRequests: Request[] = [];
  page.on('request', (request) => {
    if (isChannelCreateRequest(request)) {
      channelCreateRequests.push(request);
    }
  });
  return channelCreateRequests;
}

/**
 * The bell reads this browser's push state after the account device check. Waiting for that
 * response means a blocked browser is not still treated as able to ask.
 */
async function openPodcastBell(page: Page, permission: 'default' | 'denied'): Promise<Locator> {
  await stubBrowserNotificationPermission(page, { permission, requestResult: 'denied' });
  await mockAccountPushDevices(page, { otherBrowserWebPushDevices: 0, unifiedPushDevice: false });
  const deviceCheck = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/api/v2/account/up-device/for-account')
  );
  await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
  await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));
  await deviceCheck;
  await expectWebPushConfigured(page);
  await expect(page.getByRole('button', { name: ENABLE_BELL_NAME })).toBeVisible();
  return page.getByRole('button', { name: /Notifications for This Podcast/ });
}

test.describe('Channel notification bell', () => {
  test('Before the sign-in dialog has been shown in this browser, turning a podcast\'s notifications on asks the browser for permission, and declining still turns the podcast\'s notifications on.', async ({
    page,
  }, testInfo) => {
    try {
      await loginSeedUser(page);
      await turnPodcastNotificationsOff(page);
      const channelCreateRequests = trackChannelCreateRequests(page);
      const bell = await openPodcastBell(page, 'default');
      const channelCreate = page.waitForRequest(isChannelCreateRequest);

      await actionAndCapture(
        page,
        testInfo,
        'Declining the browser prompt still turns this podcast\'s notifications on.',
        async () => {
          await bell.click();
          await expect.poll(() => readRequestPermissionCalls(page)).toBe(1);
          await channelCreate;
          expect(channelCreateRequests).toHaveLength(1);
        },
        bell
      );
    } finally {
      await turnPodcastNotificationsOff(page);
    }
  });

  test('After the sign-in dialog has been shown in this browser, turning a podcast\'s notifications on does not ask the browser and turns them on.', async ({
    page,
  }, testInfo) => {
    try {
      await loginSeedUser(page);
      await turnPodcastNotificationsOff(page);
      const meResponse = await page.request.get(API_ME_URL);
      expect(meResponse.ok(), await meResponse.text()).toBeTruthy();
      const accountIdText = readAccountIdText(await meResponse.json());
      await page.addInitScript(
        ({ shownValue, storageKey }) => {
          window.localStorage.setItem(storageKey, shownValue);
        },
        {
          shownValue: SIGN_IN_PUSH_PROMPT_SHOWN_VALUE,
          storageKey: getSignInPushPromptShownStorageKey(accountIdText),
        }
      );
      const channelCreateRequests = trackChannelCreateRequests(page);
      const bell = await openPodcastBell(page, 'default');
      const channelCreate = page.waitForRequest(isChannelCreateRequest);

      await actionAndCapture(
        page,
        testInfo,
        'After the sign-in dialog, the bell turns notifications on without asking.',
        async () => {
          await bell.click();
          await channelCreate;
          expect(await readRequestPermissionCalls(page)).toBe(0);
          expect(channelCreateRequests).toHaveLength(1);
        },
        bell
      );
    } finally {
      await turnPodcastNotificationsOff(page);
    }
  });

  test('When this browser has blocked notifications, turning a podcast\'s notifications on does not ask and turns them on.', async ({
    page,
  }, testInfo) => {
    try {
      await loginSeedUser(page);
      await turnPodcastNotificationsOff(page);
      const channelCreateRequests = trackChannelCreateRequests(page);
      const bell = await openPodcastBell(page, 'denied');
      const channelCreate = page.waitForRequest(isChannelCreateRequest);

      await actionAndCapture(
        page,
        testInfo,
        'A browser that blocked notifications still turns this podcast on without asking.',
        async () => {
          await bell.click();
          await channelCreate;
          expect(await readRequestPermissionCalls(page)).toBe(0);
          expect(channelCreateRequests).toHaveLength(1);
        },
        bell
      );
    } finally {
      await turnPodcastNotificationsOff(page);
    }
  });
});
