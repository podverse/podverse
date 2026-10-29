import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';

const API_PATH = '/api/v2';

type StubbedPermission = 'default' | 'denied' | 'granted';

/**
 * Replaces `window.Notification` on every page load with a stub whose `permission` starts at
 * `permission` and whose `requestPermission()` counts calls and resolves to `requestResult`.
 * Use `requestResult: 'denied'` or `'default'` so the app never reaches service worker
 * registration, which headless Chromium cannot complete.
 */
export async function stubBrowserNotificationPermission(
  page: Page,
  params: { permission: StubbedPermission; requestResult: StubbedPermission }
): Promise<void> {
  await page.addInitScript(({ permission, requestResult }) => {
    const state = { permission, requestPermissionCalls: 0 };
    class StubNotification {
      static get permission(): string {
        return state.permission;
      }
      static async requestPermission(): Promise<string> {
        state.requestPermissionCalls += 1;
        state.permission = requestResult;
        return state.permission;
      }
      close(): void {
        // The stub never displays a notification.
      }
    }
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: StubNotification,
    });
    Object.defineProperty(window, '__pvE2eNotificationStub', {
      configurable: true,
      value: state,
    });
  }, params);
}

/** How many times the page called `Notification.requestPermission()` since its last load. */
export async function readRequestPermissionCalls(page: Page): Promise<number> {
  return page.evaluate(() => {
    const state: unknown = Reflect.get(window, '__pvE2eNotificationStub');
    if (typeof state !== 'object' || state === null) {
      return 0;
    }
    const calls: unknown = Reflect.get(state, 'requestPermissionCalls');
    return typeof calls === 'number' ? calls : 0;
  });
}

/**
 * Fails with a clear message when the E2E web build has no VAPID public key; without it every
 * browser reads as unable to receive push and none of the push prompts render.
 */
export async function expectWebPushConfigured(page: Page): Promise<void> {
  const vapidPublicKey = await page.evaluate(() => {
    const runtimeConfig: unknown = Reflect.get(globalThis, '__PODVERSE_RUNTIME_CONFIG__');
    if (typeof runtimeConfig !== 'object' || runtimeConfig === null) {
      return '';
    }
    const env: unknown = Reflect.get(runtimeConfig, 'env');
    if (typeof env !== 'object' || env === null) {
      return '';
    }
    const value: unknown = Reflect.get(env, 'NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY');
    return typeof value === 'string' ? value : '';
  });
  expect(
    vapidPublicKey,
    'NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY must be set for the E2E web app'
  ).not.toBe('');
}

const fulfillJson = (route: Route, body: unknown): Promise<void> =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

/**
 * Mocks the account's push devices. Web push devices use endpoints that never match this
 * browser, so they stand for another device.
 */
export async function mockAccountPushDevices(
  page: Page,
  params: { otherBrowserWebPushDevices: number; unifiedPushDevice: boolean }
): Promise<void> {
  await page.route(`**${API_PATH}/account/fcm-device/all-for-account`, (route) =>
    fulfillJson(route, [])
  );
  await page.route(`**${API_PATH}/account/webpush-device/all-for-account`, (route) =>
    fulfillJson(
      route,
      Array.from({ length: params.otherBrowserWebPushDevices }, (_, index) => ({
        endpoint: `https://push.example.com/e2e-other-browser-${index}`,
        p256dh: 'e2e-p256dh',
        auth: 'e2e-auth',
      }))
    )
  );
  await page.route(`**${API_PATH}/account/up-device/for-account`, (route) =>
    fulfillJson(
      route,
      params.unifiedPushDevice
        ? { up_endpoint: 'https://up.example.com/e2e', up_auth_key: null }
        : null
    )
  );
}

const NOTIFICATION_CATEGORIES = [
  'new-content',
  'livestream',
  'product-update',
  'maintenance',
  'terms-of-service',
  'general',
] as const;

/** Mocks GET notification preferences: every category in-app on, Push on only where listed. */
export async function mockNotificationPreferences(
  page: Page,
  params: { pushEnabledCategories: readonly string[] }
): Promise<void> {
  await page.route(`**${API_PATH}/account/notification-preferences`, (route) => {
    if (route.request().method() !== 'GET') {
      return route.fallback();
    }
    return fulfillJson(route, {
      data: NOTIFICATION_CATEGORIES.map((category, index) => ({
        id: index + 1,
        account_id: 0,
        category,
        in_app_enabled: true,
        push_enabled: params.pushEnabledCategories.includes(category),
      })),
    });
  });
}
