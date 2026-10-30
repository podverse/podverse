**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 30 — Mobile: this device's push state, one enable path, and the sign-in dialog flag

The groundwork plans 31, 32, and 33 build on. After this plan, mobile code can read this device's
push state as the shared `DevicePushState` (plan 10), turn push on for this device through one
function, and read or write the sign-in dialog's shown flag. The two places that already turn push
on (the first-Subscribe prompt and the notification settings Push switches) move onto that one
function, and `openSystemNotificationSettings` on Android opens Podverse's own notification page
instead of its general app page (plan 33's blocked-notifications guide is its caller).

This plan also removes the notification settings screen's lower permission hint entirely
(operator review D18): the `more-settings-notification-permission-hint` block, its
`more-settings-open-notification-settings` link, and the state behind them. Plan 33's warning
banner at the top of the screen replaces it. Apart from the hint, the first-Subscribe prompt and the
Push switches behave exactly as today.

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

R38. Also groundwork for R20–R32, which plans 31, 32, and 33 own. The Android direct link here is
the platform half of R32, which plan 33 owns.

## Runs after

10, 11

## Files

apps/mobile/src/push/devicePushState.ts
apps/mobile/src/push/devicePushState.read.ts
apps/mobile/src/push/devicePushState.test.ts
apps/mobile/src/push/enablePushOnThisDevice.ts
apps/mobile/src/push/fcmTransport.ts
apps/mobile/src/prefs/signInPushPromptPrefs.ts
apps/mobile/src/prefs/signInPushPromptPrefs.test.ts
apps/mobile/src/lib/notifications/applyFirstSubscribePushChoice.ts
apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx
apps/mobile/vitest.config.ts

## How mobile maps to `DevicePushState`

Plan 10 leaves the mapping to each surface. Mobile registers devices without a prompt: the
`push-device-registration` sync job (`registerPushDeviceForAccount` in
`apps/mobile/src/auth/syncAccountPrefs.ts`) registers FCM whenever permission is already granted,
and registers a Unified Push build's endpoint on every sign-in and app start. So on mobile the
prompt can only change the system permission, and the states describe that:

| State | When |
| --- | --- |
| `enabled` | This device holds a Unified Push registration (`isUnifiedPushRegisteredOnDevice()`), or the build is FCM and notification permission is granted. |
| `can_request` | FCM build, permission not granted, and the system will still show its prompt (`canAskAgain`). |
| `blocked` | FCM build, permission not granted, and the system will not show its prompt again. |
| `unsupported` | A Unified Push or no-push build (`pushProvider` is `unifiedpush` or `none`) with no Unified Push registration. No system prompt can change that; More › Advanced sets up a Unified Push endpoint, and the settings screen's existing "* Enable Unified Push first." line already says so. |

FCM granted but not yet registered reads `enabled` rather than `can_request` (plan 10's type allows
either). The sync job registers it with no prompt, and treating it as `can_request` would give a
person who already allowed notifications the sign-in dialog or a banner they cannot act on. The FCM
branch ignores the Unified Push mode, the same as the existing Push switches: enabling push on an
FCM build releases a user Unified Push choice and registers FCM.

The settings screen's `pushDeliveryReady` becomes `devicePushState === 'enabled'`. That is the same
answer it computes today (`isUnifiedPushRegisteredOnDevice() || (fcm && permission.granted)`).

## Implementation

### `apps/mobile/src/push/devicePushState.ts` (new)

Pure: type-only imports, so vitest runs it in node.

```typescript
import type { DevicePushState } from '@podverse/helpers/notificationPush';

import type { MobilePushProvider } from '../config/env';
import type { PushPermissionRequestResult } from './fcmTransport';

export type DevicePushReading = {
  fcmPermission: PushPermissionRequestResult;
  pushProvider: MobilePushProvider;
  unifiedPushRegistered: boolean;
};

/**
 * Maps this device's push reading to the shared `DevicePushState`. The push device sync job
 * registers this device with no prompt once that is possible, so `can_request` and `blocked`
 * describe only the system notification permission. A Unified Push build with no registration
 * reads `unsupported`: no prompt can change it.
 */
export const resolveDevicePushState = ({
  fcmPermission,
  pushProvider,
  unifiedPushRegistered,
}: DevicePushReading): DevicePushState => {
  if (unifiedPushRegistered) {
    return 'enabled';
  }
  if (pushProvider !== 'fcm') {
    return 'unsupported';
  }
  if (fcmPermission.granted) {
    return 'enabled';
  }
  return fcmPermission.canAskAgain ? 'can_request' : 'blocked';
};
```

### `apps/mobile/src/push/devicePushState.read.ts` (new)

The I/O half, following the `.read.ts` split in `src/auth/mobileSessionDeviceLabel.read.ts`.

```typescript
import type { DevicePushState } from '@podverse/helpers/notificationPush';

import { getMobileConfig } from '../config';
import { resolveDevicePushState } from './devicePushState';
import { getFcmPermissionStatus } from './fcmTransport';
import { isUnifiedPushRegisteredOnDevice } from './unifiedPushDeviceSync';

/** This device's push state, read fresh from the system permission and secure storage. */
export const readDevicePushState = async (): Promise<DevicePushState> => {
  const [fcmPermission, unifiedPushRegistered] = await Promise.all([
    getFcmPermissionStatus(),
    isUnifiedPushRegisteredOnDevice(),
  ]);
  return resolveDevicePushState({
    fcmPermission,
    pushProvider: getMobileConfig().pushProvider,
    unifiedPushRegistered,
  });
};
```

### `apps/mobile/src/push/enablePushOnThisDevice.ts` (new)

The one enable sequence. Its two branches are the existing sequences from
`applyFirstSubscribePushChoice` and `handleNotificationPreferenceToggle`, unchanged.

```typescript
import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { getMobileConfig } from '../config';
import { registerFcmDeviceForAccount } from './fcmDeviceSync';
import { requestFcmPermissionAfterUserAction } from './fcmTransport';
import {
  isUnifiedPushRegisteredOnDevice,
  readUnifiedPushMode,
  registerUnifiedPushDeviceForAccount,
  releaseUnifiedPushForPushProvider,
} from './unifiedPushDeviceSync';

export type EnablePushOnThisDeviceResult =
  | { outcome: 'enabled' }
  | { outcome: 'denied' }
  | { outcome: 'not_registered' };

/**
 * Turns push on for this device after a person asked for it. An FCM build shows the system
 * permission prompt and registers on a grant; a Unified Push build registers its endpoint.
 * `denied` means the person refused, or the system would not ask; `readDevicePushState` tells
 * which. `not_registered` means permission is granted, or not needed, but registering this device
 * failed. Category push settings are left alone.
 */
export const enablePushOnThisDevice = async ({
  auth,
  locale,
}: {
  auth: AuthRequestDeps;
  locale: string;
}): Promise<EnablePushOnThisDeviceResult> => {
  if (getMobileConfig().pushProvider === 'fcm') {
    const permission = await requestFcmPermissionAfterUserAction();
    if (!permission.granted) {
      return { outcome: 'denied' };
    }
    try {
      const releaseUnifiedPush =
        (await readUnifiedPushMode()) === 'user' || (await isUnifiedPushRegisteredOnDevice());
      if (releaseUnifiedPush) {
        await releaseUnifiedPushForPushProvider({ auth });
      }
      await registerFcmDeviceForAccount({ auth, locale });
    } catch (error) {
      console.warn('Failed to register FCM device after enabling push', error);
      return { outcome: 'not_registered' };
    }
    return { outcome: 'enabled' };
  }

  try {
    await registerUnifiedPushDeviceForAccount({ auth, locale });
    return (await isUnifiedPushRegisteredOnDevice())
      ? { outcome: 'enabled' }
      : { outcome: 'not_registered' };
  } catch (error) {
    console.warn('Failed to register Unified Push device after enabling push', error);
    return { outcome: 'not_registered' };
  }
};
```

`requestFcmPermissionAfterUserAction` is not wrapped: a throw from the permission API propagates to
the caller, as it does today in both copies.

The `denied` outcome carries no `canAskAgain`. No caller needs it: nothing on the settings screen
changes when the system will not ask again (step 4 of the `MoreSettingsNotificationsScreen.tsx` section removes the hint), and plans 31, 32, and 33 re-read
`readDevicePushState()` (`blocked` versus `can_request`) when they need that answer.

### `apps/mobile/src/push/fcmTransport.ts`

Replace `openSystemNotificationSettings` so Android opens Podverse's notification page. iOS keeps
`Linking.openSettings()`, which opens Podverse's page in Settings with its Notifications row; iOS has
no supported link straight to that row.

```typescript
const ANDROID_APP_NOTIFICATION_SETTINGS = 'android.settings.APP_NOTIFICATION_SETTINGS';
const ANDROID_EXTRA_APP_PACKAGE = 'android.provider.extra.APP_PACKAGE';

/**
 * Opens Podverse's notification page in system settings on Android, and Podverse's page in
 * Settings on iOS. Falls back to the app's settings page when Android refuses the intent.
 */
export const openSystemNotificationSettings = async (): Promise<void> => {
  const androidPackage = Constants.expoConfig?.android?.package;
  if (Platform.OS === 'android' && androidPackage !== undefined) {
    try {
      await Linking.sendIntent(ANDROID_APP_NOTIFICATION_SETTINGS, [
        { key: ANDROID_EXTRA_APP_PACKAGE, value: androidPackage },
      ]);
      return;
    } catch (error) {
      console.warn('Could not open app notification settings; opening app settings', error);
    }
  }
  await Linking.openSettings();
};
```

Add `import Constants from 'expo-constants';` as the first import line (it is already a dependency;
see `src/lib/mobileBrandName.ts`). No new package, no native rebuild. The package name comes from
`app.config.ts` (`android.package`, `com.podverse.app.next`), so it is never hardcoded here. Put the
two constants above `isFcmPushEnabled`.

### `apps/mobile/src/prefs/signInPushPromptPrefs.ts` (new)

Same shape as `subscribePushPromptPrefs.ts`, using plan 10's key and value.

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getSignInPushPromptShownStorageKey,
  SIGN_IN_PUSH_PROMPT_SHOWN_VALUE,
} from '@podverse/helpers/notificationPush';

/**
 * Whether this device has shown the sign-in push dialog to an account. Keyed by account id text;
 * sign-out leaves it so the same account is not asked again on this phone. An unreadable store
 * reads as not shown.
 */
export const hasShownSignInPushPrompt = async (accountIdText: string): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(getSignInPushPromptShownStorageKey(accountIdText));
    return raw === SIGN_IN_PUSH_PROMPT_SHOWN_VALUE;
  } catch (error) {
    console.warn('Could not read the sign-in push prompt flag', error);
    return false;
  }
};

export const markSignInPushPromptShown = async (accountIdText: string): Promise<void> => {
  await AsyncStorage.setItem(
    getSignInPushPromptShownStorageKey(accountIdText),
    SIGN_IN_PUSH_PROMPT_SHOWN_VALUE
  );
};
```

Do not add this key to `clearSession` or any sign-out cleanup (**mobile-account-scoped-data**: it
is keyed by account and survives sign-out).

### `apps/mobile/src/lib/notifications/applyFirstSubscribePushChoice.ts`

1. Export `accountHasAnyPushDevice` and give it a doc comment. Plans 31 and 33 import it from here; plan
   10 asks for reuse, not a copy.

```typescript
/** True when the account has an FCM, web push, or Unified Push device on any device. */
export const accountHasAnyPushDevice = async (auth: AuthRequestDeps): Promise<boolean> => {
```

2. Replace the whole `if (choice === 'enable_push') { … }` body (from
   `const pushProvider = getMobileConfig().pushProvider;` through the `if (granted) { … }` block)
   with:

```typescript
  if (choice === 'enable_push') {
    const result = await enablePushOnThisDevice({ auth, locale });
    if (result.outcome === 'enabled') {
      try {
        await setMediaPushEnabled(auth, true);
      } catch (error) {
        console.warn('Could not turn on media push preferences after first subscribe', error);
      }
    }
  } else {
```

   `enabled` is exactly today's `granted === true`: permission granted and registration did not
   throw on FCM, or the Unified Push registration landed.

3. Imports: add `import { enablePushOnThisDevice } from '../../push/enablePushOnThisDevice';`.
   Remove `getMobileConfig`, `registerFcmDeviceForAccount`, `requestFcmPermissionAfterUserAction`,
   and the four `unifiedPushDeviceSync` imports; nothing else in the file uses them.

The `in_app_only` branch, the answered flag, and `enableChannelInboxNotifications` are unchanged.

### `apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx`

1. Replace the `pushDeliveryReady` state (the `useState<boolean | null>(null)` at the
   "Null until this device's push permission…" comment) with:

```typescript
  /** Null until this device's push permission or Unified Push registration has been read. */
  const [devicePushState, setDevicePushState] = useState<DevicePushState | null>(null);
```

   and directly below `const pushProvider = getMobileConfig().pushProvider;` add:

```typescript
  const pushDeliveryReady = devicePushState === null ? null : devicePushState === 'enabled';
```

   Every existing read of `pushDeliveryReady` (`showPushRequirement`, `pushSwitchValue`,
   `pushDeliveryBlocksToggle`) stays as written.

2. Replace the `useFocusEffect` block (the one reading `isUnifiedPushRegisteredOnDevice` and
   `getFcmPermissionStatus`) with:

```typescript
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readDevicePushState()
        .then((next) => {
          if (!cancelled) {
            setDevicePushState(next);
          }
        })
        .catch((error: unknown) => {
          console.warn("Could not read this device's push state", error);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );
```

3. In `handleNotificationPreferenceToggle`, replace the whole
   `if (params.channel === 'push' && params.enabled) { … }` block (both provider branches) with:

```typescript
      if (params.channel === 'push' && params.enabled) {
        const result = await enablePushOnThisDevice({
          auth: requestContext,
          locale: selectedLocale,
        });
        setDevicePushState(await readDevicePushState());
        if (result.outcome === 'denied') {
          setErrorMessageKey('settings.notifications.permission_required');
          return;
        }
      }
```

   This keeps today's behavior apart from the hint: an FCM denial leaves the switch off, saves
   nothing, and shows `settings.notifications.permission_required` in the existing
   `more-settings-error` line; an FCM grant continues the save even when registration failed (the
   re-read reports `enabled` because permission is granted); a Unified Push build continues the
   save and reports ready only when the registration landed. The callback no longer reads
   `pushProvider`; remove it from this `useCallback`'s dependency array. The component still reads
   it elsewhere, so the const stays.

4. Remove the lower permission hint entirely, whether or not anything else on the screen is
   warning about permission:
   - Delete both `useState` calls: `notificationPermissionBlocked` / `setNotificationPermissionBlocked`
     and `showNotificationPermissionHint` / `setShowNotificationPermissionHint`. Step 3 already
     dropped every setter call; after this step no identifier containing
     `NotificationPermissionHint` or `NotificationPermissionBlocked` remains in the file.
   - In `renderPreferenceRows`, delete the `!showNotificationPermissionHint &&` line from
     `showFooter`, leaving `options.showFooterHints && isLast && !showPushRequirement`.
   - In the system notifications card, delete the whole `{showNotificationPermissionHint ? ( … ) :
     null}` block: the `permissionHint` `View`, the `more-settings-notification-permission-hint`
     `Text`, and the `notificationPermissionBlocked` `Pressable` with
     `testID="more-settings-open-notification-settings"`. The `more-settings-notification-push-requirement`
     line above it stays.
   - In the `StyleSheet.create` block, delete `permissionHint`, `warningLinkButton`, and
     `warningLinkButtonText`. Keep `warningText`: the `more-settings-error` line uses it.
   - Remove `Pressable` from the `react-native` import; nothing else in the file uses it.

5. Imports: add

```typescript
import type { DevicePushState } from '@podverse/helpers/notificationPush';
```

   on its own line after the existing `import type { DTOAccountNotificationPreference } …` line
   (**type-imports-separate-line**), plus

```typescript
import { readDevicePushState } from '../../push/devicePushState.read';
import { enablePushOnThisDevice } from '../../push/enablePushOnThisDevice';
```

   in the `../../push/` group. Remove the `../../push/fcmDeviceSync` import
   (`registerFcmDeviceForAccount`), the whole `../../push/fcmTransport` import
   (`getFcmPermissionStatus`, `openSystemNotificationSettings`, `requestFcmPermissionAfterUserAction`;
   step 4 removed the only `openSystemNotificationSettings` call, and plan 33 imports it again for
   its guide), and the whole `../../push/unifiedPushDeviceSync` import.

### `apps/mobile/vitest.config.ts`

In `include`:

- Replace `'src/lib/notifications/notificationsBellPress.test.ts',` with
  `'src/lib/notifications/*.test.ts',` so plans 31 and 32 add their tests there without touching
  this file.
- Add `'src/prefs/signInPushPromptPrefs.test.ts',` after `'src/prefs/prefsStore.test.ts',`.
- Add `'src/push/devicePushState.test.ts',` after `'src/push/accountNotificationLink.test.ts',`.

In the doc comment above `defineConfig`, after `` `src/prefs/bannerNotificationPrefs.ts`), `` add:
`` this device's push state (`src/push/devicePushState.ts` — the reads stay in
`devicePushState.read.ts`), the sign-in push dialog's shown flag
(`src/prefs/signInPushPromptPrefs.ts` — AsyncStorage mocked), the push prompt decisions in
`src/lib/notifications/` (reads injected), `` and keep the rest of the sentence.

## Reuse

- `DevicePushState` and the storage key and value from `@podverse/helpers/notificationPush`
  (plan 10). Mobile imports the subpath, never the barrel.
- `getFcmPermissionStatus`, `requestFcmPermissionAfterUserAction`, `registerFcmDeviceForAccount`,
  and the `unifiedPushDeviceSync` functions, unchanged.
- `accountHasAnyPushDevice`, exported in place.

## Tests

- `apps/mobile/src/push/devicePushState.test.ts` (vitest, `describe`/`it.each` table): Unified Push
  registered reads `enabled` on an FCM build with permission not granted and on a Unified Push
  build; `unifiedpush` and `none` builds with no registration read `unsupported` even when
  `fcmPermission` says granted; FCM granted reads `enabled`; FCM not granted with `canAskAgain`
  reads `can_request`; FCM not granted without it reads `blocked`.
- `apps/mobile/src/prefs/signInPushPromptPrefs.test.ts`: mock
  `@react-native-async-storage/async-storage` with an in-memory map, as
  `src/prefs/homeListPrefs.test.ts` does. Cases: unknown account reads false; after
  `markSignInPushPromptShown('abc123')` it reads true and the stored key is
  `notifications.sign_in_push_prompt_shown:abc123`; another account still reads false; a rejecting
  `getItem` reads false.
- No device flow in this plan. The refactored paths are covered by the existing `push`,
  `notifications-inbox`, and Subscribe flows that the set's last prompt lists.
- Removing the hint needs no test edits. No Maestro flow under `apps/mobile/e2e/` and no vitest
  file references `more-settings-notification-permission-hint`,
  `more-settings-open-notification-settings`, or the hint state; a Grep for those two test ids
  over `apps/mobile/` after the change finds nothing.

## Release scratchpad

```markdown
## Mobile notification settings drops the lower "permission required" hint

- Surfaces: mobile
- Change: More › Settings › Notifications no longer shows the "permission required" hint and its
  "Open System Settings" button under the system notifications card, in any state. The device
  push warning banner at the top of the same screen covers a phone without notification
  permission (separate entry). Turning on a Push switch and refusing the system prompt still
  leaves the switch off, saves nothing, and shows the "permission required" message in the
  screen's error line. The first-Subscribe Enable Push answer and the Push switches now share one
  enable path; otherwise their behavior is unchanged.
- Who notices: members who refuse notification permission from a Push switch
- Operator steps: none
```
