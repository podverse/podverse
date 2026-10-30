**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 20 — Web: this browser's push state, the sign-in dialog flags, and shared E2E helpers

The groundwork plans 21, 22, and 23 build on. After this plan, any web component can ask "what is
this browser's push state for the signed-in account" as a `DevicePushState` (from plan 10), wait
until that answer is final, refresh it after asking the browser for permission, and read or write
the two sign-in dialog flags. No visible behavior changes in this plan.

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

none (groundwork for R7–R19; plans 21, 22, and 23 own the rows)

## Runs after

10, 11

## Files

apps/web/src/lib/notifications/webDevicePushState.ts
apps/web/src/lib/notifications/webDevicePushState.test.ts
apps/web/src/lib/notifications/signInPushPrompt.ts
apps/web/src/lib/notifications/signInPushPrompt.test.ts
apps/web/src/hooks/useWebDevicePushState.ts
apps/web/src/contexts/Notifications.tsx
apps/web/src/components/Settings/Panels/SettingsNotifications/usePushChannelControls.ts
apps/web/src/lib/notifications/firstSubscribePushPrompt.ts
apps/web/e2e/helpers/webPushPermission.ts

## How web maps to `DevicePushState`

Plan 10 defines the union and leaves the mapping to each surface. On web:

| State | When |
| --- | --- |
| `unsupported` | `window.Notification`, `navigator.serviceWorker`, or `window.PushManager` is missing, or `config.public.notifications.webpush.vapidPublicKey` is empty. `requestNotificationPermission` already refuses without the VAPID key. |
| `enabled` | The account has a Unified Push device (`upRegistered` in the Notifications context), or `Notification.permission === 'granted'` and this browser's push subscription endpoint matches one of the account's web push devices (`registered`). |
| `blocked` | `Notification.permission === 'denied'`. The browser does not show its prompt again. |
| `can_request` | Anything else: permission `default`, or `granted` with this browser not registered. |

A Unified Push device counts as `enabled` because the web settings screen already treats Web Push
and Unified Push as alternatives (`pushMethodRegistered = registered || upRegistered` in
`SettingsNotifications.tsx`, and `enableWebPush` unregisters the Unified Push device first). Reading
it any other way would let the banner button in plan 23 delete an account's Unified Push device.

`registered` starts `false` and is settled asynchronously by `NotificationsProvider`. Until it is
settled, a browser that already granted permission would read as `can_request` and could get the
sign-in dialog by mistake, so the context gains `pushStateChecked`, and the hook reports
`isChecked`. The dialog (plan 21) and banner (plan 23) wait for `isChecked`. The channel bell
(plan 22) acts on the state as it stands when pressed.

## Implementation

### `apps/web/src/lib/notifications/webDevicePushState.ts` (new)

```typescript
import type { DevicePushState } from '@podverse/helpers';

/**
 * This browser's push state for the signed-in account. An account Unified Push device counts as
 * enabled because web settings treat Web Push and Unified Push as alternatives.
 */
export const getWebDevicePushState = (params: {
  accountUnifiedPushRegistered: boolean;
  notificationApiAvailable: boolean;
  permission: NotificationPermission;
  thisBrowserWebPushRegistered: boolean;
  vapidPublicKeyConfigured: boolean;
}): DevicePushState => {
  if (!params.notificationApiAvailable || !params.vapidPublicKeyConfigured) {
    return 'unsupported';
  }
  if (params.accountUnifiedPushRegistered) {
    return 'enabled';
  }
  if (params.permission === 'granted' && params.thisBrowserWebPushRegistered) {
    return 'enabled';
  }
  if (params.permission === 'denied') {
    return 'blocked';
  }
  return 'can_request';
};

/** True when this browser exposes the Notification, service worker, and Push APIs. */
export const isWebPushApiAvailable = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};
```

### `apps/web/src/lib/notifications/signInPushPrompt.ts` (new)

Two flags. The shown flag is per account in `localStorage` with plan 10's key and value. The
pending flag is in `sessionStorage`: `ModalAuthLogin` sets it right before its post-login reload
(plan 21), and the first fully rendered page after the reload takes it. Follow the shape of
`apps/web/src/lib/auth/sessionEndedNotice.ts` (`storePendingSessionEndedNotice` /
`takePendingSessionEndedNotice`).

```typescript
import {
  getSignInPushPromptShownStorageKey,
  SIGN_IN_PUSH_PROMPT_SHOWN_VALUE,
} from '@podverse/helpers';

const SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY = 'podverse.auth.sign_in_push_prompt_pending';

/**
 * Whether the sign-in push dialog was shown for this account in this browser. An unreadable
 * localStorage reads as shown, so a private window is not asked on every sign-in.
 */
export const hasShownSignInPushPrompt = (accountIdText: string): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    return (
      window.localStorage.getItem(getSignInPushPromptShownStorageKey(accountIdText)) ===
      SIGN_IN_PUSH_PROMPT_SHOWN_VALUE
    );
  } catch {
    return true;
  }
};

export const markSignInPushPromptShown = (accountIdText: string): void => {
  try {
    window.localStorage.setItem(
      getSignInPushPromptShownStorageKey(accountIdText),
      SIGN_IN_PUSH_PROMPT_SHOWN_VALUE
    );
  } catch {
    // Private browsing can refuse localStorage; the next sign-in may ask again.
  }
};

/** Saves "this browser just signed in" for the page load after the sign-in reload. */
export const markSignInPushPromptPending = (): void => {
  try {
    window.sessionStorage.setItem(SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY, '1');
  } catch {
    // sessionStorage can be disabled; a failure means no sign-in dialog this time.
  }
};

/** Returns whether a sign-in is pending and clears it, so only one page load acts on it. */
export const takeSignInPushPromptPending = (): boolean => {
  try {
    const pending = window.sessionStorage.getItem(SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY);
    window.sessionStorage.removeItem(SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY);
    return pending === '1';
  } catch {
    return false;
  }
};
```

### `apps/web/src/contexts/Notifications.tsx`

Add two members to `NotificationsContextType`, the default context value, and the provider value:

```typescript
  /** True once this page has checked this browser's permission and registration for the account. */
  pushStateChecked: boolean;
  /** Re-reads `Notification.permission` and whether this browser's subscription is registered. */
  refreshWebPushRegistration: () => Promise<void>;
```

Default context value: `pushStateChecked: false` and `refreshWebPushRegistration: async () => {}`.

In `NotificationsProvider`:

1. Add `const [pushStateChecked, setPushStateChecked] = useState(false);` and
   `const vapidPublicKey = config.public.notifications.webpush.vapidPublicKey;` at provider scope
   (remove the `vapidPublicKey` local inside the effect).
1. Add this callback above the effect that currently runs `init`:

```typescript
  const refreshWebPushRegistration = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    if (currentPermission !== 'granted' || !vapidPublicKey) {
      setRegistered(false);
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration(
        WEB_PUSH_SERVICE_WORKER_PATH
      );
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription === null) {
        setRegistered(false);
        return;
      }
      const devices = await getApiRequestService().reqAccountWebPushDeviceGetAllForAccount();
      setRegistered(devices.some((device) => device.endpoint === subscription.endpoint));
    } catch (error) {
      console.warn('Could not check this browser web push registration', error);
      setRegistered(false);
    }
  }, [vapidPublicKey]);
```

1. In the effect that defines `init` (it depends on `loggedInAccount` and `handleForegroundPush`):
   - First line of the effect body: `setPushStateChecked(false);`, before the `!loggedInAccount`
     and `'Notification' in window` early returns.
   - Inside `init`, keep the `setPermission(p)` / `ensureWebPushServiceWorkerScriptUrl` lines and the
     Unified Push block unchanged.
   - Replace the whole `// Check Web Push devices` block (the `if (p === 'granted' &&
     vapidPublicKey) { ... }` block) with:

```typescript
      await refreshWebPushRegistration();
      setPushStateChecked(true);
```

   - Add `refreshWebPushRegistration` to that effect's dependency array.
1. Add `pushStateChecked` and `refreshWebPushRegistration` to the provider `value`.

### `apps/web/src/hooks/useWebDevicePushState.ts` (new)

```typescript
import type { DevicePushState } from '@podverse/helpers';

import { useConfig } from '../contexts/Config';
import { useNotifications } from '../contexts/Notifications';
import { getWebDevicePushState, isWebPushApiAvailable } from '../lib/notifications/webDevicePushState';

/**
 * This browser's push state for the signed-in account. `isChecked` is false until the
 * Notifications provider has finished checking permission and registration; an unsupported
 * browser is checked at once.
 */
export function useWebDevicePushState(): { devicePushState: DevicePushState; isChecked: boolean } {
  const config = useConfig();
  const { permission, pushStateChecked, registered, upRegistered } = useNotifications();
  const devicePushState = getWebDevicePushState({
    accountUnifiedPushRegistered: upRegistered,
    notificationApiAvailable: isWebPushApiAvailable(),
    permission,
    thisBrowserWebPushRegistered: registered,
    vapidPublicKeyConfigured: Boolean(config.public.notifications.webpush.vapidPublicKey),
  });
  return {
    devicePushState,
    isChecked: devicePushState === 'unsupported' || pushStateChecked,
  };
}
```

On the server `isWebPushApiAvailable()` is false, so the state is `unsupported` there; plans 21 and
23 render nothing for `unsupported`, and on the client they render nothing until `isChecked`, so
there is no hydration mismatch.

### `apps/web/src/components/Settings/Panels/SettingsNotifications/usePushChannelControls.ts`

- Add `refreshWebPushRegistration` to the `useNotifications()` destructure.
- In `enableWebPush`, replace the entire body of the `finally { ... }` block (the
  `if (typeof window !== 'undefined' && 'Notification' in window) { ... }` permission and
  registration check) with `await refreshWebPushRegistration();`. The callback does the same check
  in one place.
- Leave `disableWebPush`, the Unified Push functions, and the returned object unchanged.

### `apps/web/src/lib/notifications/firstSubscribePushPrompt.ts`

Export the existing `accountHasAnyPushDevice` (add `export`; no other change). Plan 21 imports it
for `shouldOfferSignInPushPrompt`'s `accountHasPushDevice`. Do not change the Subscribe prompt's
storage, `applyFirstSubscribePushChoice`, or anything else in this file.

### `apps/web/e2e/helpers/webPushPermission.ts` (new)

Shared by the specs in plans 21, 22, and 23. Headless Chromium's real permission state is not
controllable enough, so specs replace `window.Notification` before page scripts run and mock the
account's device and preference routes.

```typescript
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
      close(): void {}
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
    const value: unknown = Reflect.get(runtimeConfig, 'NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY');
    return typeof value === 'string' ? value : '';
  });
  expect(
    vapidPublicKey,
    'NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY must be set for the E2E web app'
  ).not.toBe('');
}

const fulfillJson = (route: Route, body: unknown): Promise<void> =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

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
```

Before finishing, confirm two shapes against the code and adjust the helper only if they differ:

- The device GET bodies are the raw value (array, object, or `null`) and the preferences GET body is
  `{ data: [...] }`: `packages/helpers-requests/src/api/account/{fcm,webpush,unifiedpush}/*.ts` and
  `packages/helpers-requests/src/api/account/notification/notifications.ts`
  (`reqNotificationPreferencesGet`).
- `__PODVERSE_RUNTIME_CONFIG__` holds `NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY` as a top-level key:
  `apps/web/src/config/runtime-config.ts`.

## Tests

- `apps/web/src/lib/notifications/webDevicePushState.test.ts` (vitest): one table-driven
  `it.each` over `getWebDevicePushState` covering: API unavailable → `unsupported`; no VAPID key →
  `unsupported`; Unified Push registered with permission `default` → `enabled`; `granted` and
  registered → `enabled`; `granted` and not registered → `can_request`; `default` → `can_request`;
  `denied` → `blocked`.
- `apps/web/src/lib/notifications/signInPushPrompt.test.ts` (vitest, jsdom): clear both storages in
  `beforeEach`. Cases: `hasShownSignInPushPrompt` is false before and true after
  `markSignInPushPromptShown` for the same account, and still false for another account;
  `takeSignInPushPromptPending` is false with nothing set, true once after
  `markSignInPushPromptPending`, then false; `hasShownSignInPushPrompt` is true when
  `localStorage.getItem` throws (`vi.spyOn(Storage.prototype, 'getItem')`).
- No E2E in this plan; plans 21, 22, and 23 use the helper.

## Release scratchpad

none
