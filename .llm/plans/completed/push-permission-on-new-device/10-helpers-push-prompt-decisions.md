**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 10 — Shared push prompt and banner decisions in `@podverse/helpers`

Pure functions that web and mobile call to decide three things the same way: whether to show the
one-time dialog after signing in on a device, whether the notification settings screen shows the
device push warning banner, and whether the channel notification bell may open the automatic
enable-push prompt. Also the shared storage key for "the sign-in dialog was shown for this account
on this device". Storage stays per surface (web `localStorage`, mobile AsyncStorage); only the key
and value are shared.

Every decision below is settled. Transcribe the code; do not change names or behavior.

## Rows

R1, R2, R3, R4, R33

## Runs after

none

## Files

packages/helpers/src/lib/notificationPush.ts
packages/helpers/src/lib/notificationPush.test.ts
packages/helpers/src/index.ts
packages/helpers/package.json

## What "push on" means (answers R1 and R2)

- Clients read the rows from `GET /account/notification-preferences`
  (`reqNotificationPreferencesGet` on web, `notificationsRepository.listPreferences` on mobile).
  That route calls `AccountNotificationPreferenceService.seedDefaultsForAccount`
  (`apps/api/src/controllers/account/accountNotification.ts`, `getPreferences`), and account
  creation seeds the same rows (`packages/orm/src/services/account/account.ts`). So the response is
  always the saved rows, one per category, and a missing category is filled with its default before
  the response is sent. There is no "unsaved default" to tell apart in the response.
- `DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES` (`packages/helpers/src/lib/notificationCategory.ts`)
  has push on for `new-content` and `livestream`. So "at least one category has Push on" is true
  for every account that has not turned those off, including a brand-new account that never
  enabled push anywhere.
- `hasAnyCategoryPushEnabled` matches the server's own test in
  `packages/orm/src/services/account/createAccountNotificationWithOptionalPush.ts`
  (`preferences.some((preference) => preference.push_enabled === true)`): Push alone counts, In-App
  does not matter, and a show's notification bell does not count.
- **Sign-in dialog:** because seeded defaults read as push on, the dialog also requires that the
  account has at least one registered push device (FCM, web push, or Unified Push) on any device.
  That device is the evidence the person went through enabling push somewhere. It mirrors the
  Subscribe flow, which already treats the seeded defaults as unconfirmed until a device exists
  (`applyFirstSubscribePushChoice` turns media push off on In-App Only when the account has no
  device). Without it, every new account would get the dialog on its first sign-in, which the
  request rules out ("we don't want to ask them for that permission unless they already have
  notifications saved").
- **Banner (R3, R4, R33):** same device requirement as the dialog (review D2). True only when
  `accountHasPushDevice` is true, `hasAnyCategoryPushEnabled(preferences)` is true, and
  `devicePushState` is `can_request` or `blocked`. A new account that only has the seeded defaults
  has no registered push device, so it does not see the banner. Hidden when no category has Push
  on.
- **Device state** is a four-value union each surface computes from its platform (`DevicePushState`
  below). The dialog needs `can_request`: a `blocked` device skips the dialog (Yes could not show
  the platform prompt) and is not recorded as shown, so a later sign-in can still ask once the
  person unblocks. The banner, when the account has a registered push device and a category has
  Push on, shows for `can_request` and `blocked`. `unsupported` gets neither.
- **Channel bell:** may open the automatic enable-push prompt only while the device is
  `can_request` and the sign-in dialog has not been shown on this device for this account. Once
  shown, the person turns this device on from notification settings.
- The shown flag is keyed by account and survives sign-out, the same as the Subscribe prompt's
  answered flag (`apps/mobile/src/prefs/subscribePushPromptPrefs.ts`). On mobile it is
  "keyed by account" data under **mobile-account-scoped-data**, so `clearSession` leaves it.

## Implementation

### `packages/helpers/src/lib/notificationPush.ts` (new)

Write exactly this module:

```typescript
import type { DTOAccountNotificationPreference } from '../dtos/account/accountNotificationPreference.js';

/**
 * Whether this device can receive push for the signed-in account. Each surface maps its own
 * platform reading to one of these.
 *
 * - `enabled`: permission is granted and this device is registered for the account.
 * - `can_request`: asking shows the platform permission prompt, or permission is already granted
 *   and only this device's registration is missing.
 * - `blocked`: the platform will not show its prompt again; the person changes it in browser or
 *   system settings.
 * - `unsupported`: this browser or build cannot receive push.
 */
export type DevicePushState = 'enabled' | 'can_request' | 'blocked' | 'unsupported';

export type NotificationPushPreferenceRow = Pick<DTOAccountNotificationPreference, 'push_enabled'>;

const SIGN_IN_PUSH_PROMPT_SHOWN_KEY_PREFIX = 'notifications.sign_in_push_prompt_shown:';

export const SIGN_IN_PUSH_PROMPT_SHOWN_VALUE = '1';

/**
 * Web `localStorage` and mobile AsyncStorage store the sign-in push dialog's shown flag under this
 * key, with `SIGN_IN_PUSH_PROMPT_SHOWN_VALUE` as the value.
 */
export const getSignInPushPromptShownStorageKey = (accountIdText: string): string => {
  return `${SIGN_IN_PUSH_PROMPT_SHOWN_KEY_PREFIX}${accountIdText}`;
};

/**
 * True when at least one category has Push on. Pass the rows from the notification preferences
 * GET; it seeds missing categories with their defaults, so a new account reads as push on for New
 * Content and Livestream.
 */
export const hasAnyCategoryPushEnabled = (
  preferences: readonly NotificationPushPreferenceRow[]
): boolean => {
  return preferences.some((preference) => preference.push_enabled === true);
};

/**
 * The one-time dialog right after signing in on this device. A registered push device on the
 * account separates push the person turned on from the defaults every account is seeded with.
 */
export const shouldOfferSignInPushPrompt = (params: {
  accountHasPushDevice: boolean;
  devicePushState: DevicePushState;
  preferences: readonly NotificationPushPreferenceRow[];
  signInPushPromptShown: boolean;
}): boolean => {
  return (
    !params.signInPushPromptShown &&
    params.devicePushState === 'can_request' &&
    params.accountHasPushDevice &&
    hasAnyCategoryPushEnabled(params.preferences)
  );
};

/**
 * The warning banner at the top of the notification settings screen. Same device requirement as
 * the sign-in dialog: a registered push device on the account, a category with Push on, and this
 * device has not allowed notifications (`can_request` or `blocked`).
 */
export const shouldShowDevicePushBanner = (params: {
  accountHasPushDevice: boolean;
  devicePushState: DevicePushState;
  preferences: readonly NotificationPushPreferenceRow[];
}): boolean => {
  const deviceHasNotAllowed =
    params.devicePushState === 'can_request' || params.devicePushState === 'blocked';
  return (
    params.accountHasPushDevice &&
    hasAnyCategoryPushEnabled(params.preferences) &&
    deviceHasNotAllowed
  );
};

/**
 * Whether turning on a channel's notifications may open the automatic enable-push prompt. After
 * the sign-in dialog has been shown on this device, the person turns push on from notification
 * settings instead.
 */
export const shouldAutoPromptPushFromChannelBell = (params: {
  devicePushState: DevicePushState;
  signInPushPromptShown: boolean;
}): boolean => {
  return params.devicePushState === 'can_request' && !params.signInPushPromptShown;
};
```

### `packages/helpers/src/index.ts`

Add one line directly below `export * from './lib/notificationCategory.js';`:

```typescript
export * from './lib/notificationPush.js';
```

### `packages/helpers/package.json`

Mobile cannot import the barrel (it pulls Node-only modules), so add a subpath export. Insert
this entry in `exports` directly after the `"./authSessionNotice"` entry:

```json
    "./notificationPush": {
      "types": "./dist/lib/notificationPush.d.ts",
      "default": "./dist/lib/notificationPush.js"
    },
```

Do not change the package version.

## Contract for areas B and C

| Import | Web | Mobile |
| --- | --- | --- |
| Module | `@podverse/helpers` (barrel) | `@podverse/helpers/notificationPush` |

Exports: `DevicePushState`, `NotificationPushPreferenceRow`, `SIGN_IN_PUSH_PROMPT_SHOWN_VALUE`,
`getSignInPushPromptShownStorageKey(accountIdText)`, `hasAnyCategoryPushEnabled(preferences)`,
`shouldOfferSignInPushPrompt({ accountHasPushDevice, devicePushState, preferences,
signInPushPromptShown })`, `shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState, preferences })`,
`shouldAutoPromptPushFromChannelBell({ devicePushState, signInPushPromptShown })`.

What each surface supplies:

- `preferences`: the rows from `GET /account/notification-preferences`. `DTOAccountNotificationPreference[]`
  satisfies `readonly NotificationPushPreferenceRow[]` with no mapping.
- `accountHasPushDevice`: true when the account has any FCM device, any web push device, or a
  Unified Push device. Both surfaces already compute this in a private `accountHasAnyPushDevice`
  (`apps/web/src/lib/notifications/firstSubscribePushPrompt.ts`,
  `apps/mobile/src/lib/notifications/applyFirstSubscribePushChoice.ts`). Export and reuse that
  function; do not write a third copy. Pass the same value into `shouldOfferSignInPushPrompt` and
  `shouldShowDevicePushBanner`.
- `devicePushState`: each surface maps its platform reading. Areas B and C own the mapping; it
  must follow the meaning documented on the type.
- `signInPushPromptShown`: `storage.getItem(getSignInPushPromptShownStorageKey(id)) ===
  SIGN_IN_PUSH_PROMPT_SHOWN_VALUE`. Write the flag only after the dialog is actually presented,
  for either answer. A storage failure reads as not shown on mobile; on web, follow
  `hasAnsweredFirstSubscribePushPrompt`, which treats an unreadable `localStorage` as answered so a
  private window is not asked on every load.

Neither dialog answer changes category push settings.

## Tests

Add `packages/helpers/src/lib/notificationPush.test.ts` (vitest, same import style as
`authSessionNotice.test.ts`). Keep it table-driven where cases share a shape
(**unit-test-design-no-overgranularity**):

- `getSignInPushPromptShownStorageKey('abc123')` is `'notifications.sign_in_push_prompt_shown:abc123'`.
- `hasAnyCategoryPushEnabled`: `[]` is false; all rows `push_enabled: false` is false; one row
  true is true.
- `shouldOfferSignInPushPrompt`: true when not shown, `can_request`, device on the account, and
  one row with push on. False when any one of those changes: shown, no device, no push row, and
  each of `enabled`, `blocked`, `unsupported`.
- `shouldShowDevicePushBanner`: true for `can_request` and `blocked` when `accountHasPushDevice`
  is true and a push row is on. False for `enabled` and `unsupported`, false for `can_request`
  with no push row, and false when `accountHasPushDevice` is false.
- `shouldAutoPromptPushFromChannelBell`: true for `can_request` and not shown. False when shown,
  and false for `enabled`, `blocked`, and `unsupported`.

## Release scratchpad

none
