**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 33 — Mobile: warning banner at the top of notification settings when this phone lacks push

When the account already has a registered push device somewhere, has Push on for at least one
category, and this phone has not allowed notifications, More › Settings › Notifications opens with
a warning-colored banner as its first
element: "Push notifications are turned on for your account, but this device doesn't have
permission to show them." with an "Allow on This Device" button. While the system can still ask,
the button shows the system prompt. Once the system will not ask again, the button opens a short
guide whose main action opens Podverse's notification page in system settings.

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

R27, R28, R29, R30, R31, R32, R37

## Runs after

10, 11, 30

## Files

apps/mobile/src/components/feedback/WarningBanner.tsx
apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx
apps/mobile/e2e/notifications-inbox.yaml
apps/mobile/e2e/scripts/push-device-fixture.js

## Behavior

- **Shown when (R37)** signed in, this phone's state is read, the account's push devices have been
  checked, and plan 10's `shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState,
  preferences: notificationPreferences })` is true: the account has an FCM, Web Push, or Unified
  Push device registered anywhere, state `can_request` or `blocked`, and at least one loaded
  preference row has `push_enabled`. Hidden while the state, the device check, or the preferences
  are still loading, and for `enabled` and `unsupported`. Signed out, nothing is checked, so it
  stays hidden. A new account with only the seeded category defaults and no push device never sees
  it (operator review D2).
- **Account device check:** `accountHasAnyPushDevice(requestContext)`, which plan 30 exports from
  `src/lib/notifications/applyFirstSubscribePushChoice.ts` (reuse, not a copy). It runs when the
  screen mounts and whenever `isAuthenticated` or `requestContext` changes, the same triggers as the
  preferences load. A failed check (for example a membership refusal) logs a warning and reads
  `false`, so the banner stays hidden rather than guessing. When a Push switch on this screen
  registers this phone (`enablePushOnThisDevice` returns `enabled`), the screen sets it to `true`
  without a refetch, so revoking permission later in system settings shows the banner on return.
- **Placement (R31):** the first element inside the screen's `cardStack`, above the "When I
  Subscribe" card, so it sits at the very top and takes the stack's card gap.
- **Colors (R30):** warning fill `tokens.background.warning`, border `tokens.border.warning`, and a
  leading `warning-outline` glyph in `tokens.text.warning`, as `CustomApiNotice` and
  `OfflineModeBanner` use. Message text stays `textPrimary` for contrast. No danger tokens.
- **Button, `can_request` (R29):** runs `enablePushOnThisDevice`, which shows the system prompt,
  then re-reads the state. A grant hides the banner. A refusal leaves the banner up; if the system
  now reports it will not ask again, the state becomes `blocked` and the next press opens the guide.
  The guide does not open straight after a refusal: the person just answered the system. A failed
  registration after a grant shows `errors.generic` in the existing `more-settings-error` line.
- **Button, `blocked` (R29, R32):** iOS never shows the prompt again after a refusal, and Android
  stops after the second, so the button opens a guide (`ConfirmDialog`): title
  `device_push_blocked_title`, body `device_push_blocked_mobile_body`, confirm "Open System Settings"
  (`openSystemNotificationSettings`, which plan 30 points at Podverse's own notification page on
  Android), cancel `misc.cancel`.
- **Coming back from system settings:** the screen re-reads the state each time the app returns
  from the background. When it goes from `blocked` to `enabled`, the screen registers this phone
  (`enablePushOnThisDevice`, which skips the prompt when permission is already granted), because the
  push device sync job only runs at app start and sign-in. Only a `blocked` start counts: a
  `can_request` → `enabled` change comes from an in-app prompt that is already registering.
- **No lower hint:** plan 30 removed the "permission required" hint and its "Open System Settings"
  link under the system card in every state (operator review D18). The banner is the screen's only
  permission warning. When the banner is hidden (no push device on the account, or every
  category's Push off) and a person refuses the system prompt from a Push switch, the switch stays
  off and the `more-settings-error` line shows `settings.notifications.permission_required`, as
  plan 30 leaves it. This plan adds nothing that reads the removed hint state.
- `unsupported` (a Unified Push build with no registration) gets no banner; the existing
  "* Enable Unified Push first." line under the system card covers it. The catalog key
  `preference_push_requirement_unified_push` is not used by the banner.

## Implementation

### `apps/mobile/src/components/feedback/WarningBanner.tsx` (new)

A generic warning callout with one action, for reuse on other screens
(**mobile-reusable-components**).

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

const WARNING_BANNER_ICON_SIZE = 20;

export type WarningBannerProps = {
  /** Already localized. */
  actionLabel: string;
  actionLoading?: boolean;
  actionTestID: string;
  /** Already localized. The message's accessible name. */
  message: string;
  onAction: () => void;
  testID: string;
};

/**
 * A warning about the screen it sits on, with one action that resolves it. Warning fill, border,
 * and glyph; never the danger colors.
 */
export function WarningBanner({
  actionLabel,
  actionLoading = false,
  actionTestID,
  message,
  onAction,
  testID,
}: WarningBannerProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        action: {
          alignItems: 'flex-start',
        },
        banner: {
          backgroundColor: tokens.background.warning,
          borderColor: tokens.border.warning,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          gap: tokens.spacing.md,
          padding: tokens.spacing.md,
        },
        message: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          flex: 1,
        },
        messageRow: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.banner} testID={testID}>
      <View
        accessibilityLabel={message}
        accessibilityRole="text"
        accessible
        style={styles.messageRow}
      >
        <Ionicons
          accessibilityElementsHidden
          accessible={false}
          color={tokens.text.warning}
          importantForAccessibility="no"
          name="warning-outline"
          size={WARNING_BANNER_ICON_SIZE}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.action}>
        <Button
          label={actionLabel}
          loading={actionLoading}
          onPress={onAction}
          size="sm"
          testID={actionTestID}
          variant="outline"
        />
      </View>
    </View>
  );
}
```

### `apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx`

Plan 30 already replaced `pushDeliveryReady` with `devicePushState`, imports
`readDevicePushState`, `enablePushOnThisDevice`, and the `DevicePushState` type, and removed the
lower permission hint with its state, styles, `Pressable` import, and the whole
`../../push/fcmTransport` import.

1. Imports:
   - Add `useRef` to the `react` import, and `AppState` to the `react-native` import.
   - Add `import { shouldShowDevicePushBanner } from '@podverse/helpers/notificationPush';` on its
     own line directly after plan 30's `import type { DevicePushState } …` line.
   - Add `import { WarningBanner } from '../../components/feedback/WarningBanner';` after the
     `ConfirmDialog` import.
   - Add `import { accountHasAnyPushDevice } from '../../lib/notifications/applyFirstSubscribePushChoice';`
     directly before the `../../lib/notifications/notificationTypeRows` import.
   - Add `import { openSystemNotificationSettings } from '../../push/fcmTransport';` directly after
     plan 30's `../../push/enablePushOnThisDevice` import.

2. State, next to the other `useState` calls:

```typescript
  /** Null until the account's push devices have been checked. */
  const [accountHasPushDevice, setAccountHasPushDevice] = useState<boolean | null>(null);
  const [blockedGuidanceVisible, setBlockedGuidanceVisible] = useState(false);
  const [devicePushBannerBusy, setDevicePushBannerBusy] = useState(false);
  const devicePushStateRef = useRef<DevicePushState | null>(null);
  devicePushStateRef.current = devicePushState;
```

3. Directly after the `pushRequirementKey` const, add:

```typescript
  const showDevicePushBanner =
    isAuthenticated &&
    accountHasPushDevice !== null &&
    devicePushState !== null &&
    shouldShowDevicePushBanner({
      accountHasPushDevice,
      devicePushState,
      preferences: notificationPreferences,
    });
```

4. Directly after the preferences-loading `useEffect` (the one calling
   `notificationsRepository.listPreferences`), add the account device check, in the same shape:

```typescript
  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (!isAuthenticated) {
        setAccountHasPushDevice(null);
        return;
      }

      try {
        const hasDevice = await accountHasAnyPushDevice(requestContext);
        if (isMounted) {
          setAccountHasPushDevice(hasDevice);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.warn('Could not check the account for push devices', error);
        setAccountHasPushDevice(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, requestContext]);
```

5. In `handleNotificationPreferenceToggle`, in plan 30's `if (params.channel === 'push' &&
   params.enabled) { … }` block, directly after the `if (result.outcome === 'denied') { … }` block
   and still inside the outer block, add:

```typescript
        if (result.outcome === 'enabled') {
          setAccountHasPushDevice(true);
        }
```

   The setter is stable, so the `useCallback` dependency array does not change.

6. Directly after the `useFocusEffect` block, add the return-from-settings re-read:

```typescript
  useEffect(() => {
    let previousAppState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const returnedFromBackground = previousAppState === 'background' && nextAppState === 'active';
      previousAppState = nextAppState;
      if (!returnedFromBackground) {
        return;
      }
      const previous = devicePushStateRef.current;
      void readDevicePushState()
        .then(async (next) => {
          setDevicePushState(next);
          if (previous === 'blocked' && next === 'enabled') {
            await enablePushOnThisDevice({ auth: requestContext, locale: selectedLocale });
          }
        })
        .catch((error: unknown) => {
          console.warn("Could not refresh this device's push state", error);
        });
    });
    return () => {
      subscription.remove();
    };
  }, [requestContext, selectedLocale]);
```

7. Next to `confirmApplyDialog`, add the banner action:

```typescript
  const handleDevicePushBannerAction = useCallback(async () => {
    if (devicePushState === 'blocked') {
      setBlockedGuidanceVisible(true);
      return;
    }
    setDevicePushBannerBusy(true);
    setErrorMessageKey(null);
    try {
      const result = await enablePushOnThisDevice({
        auth: requestContext,
        locale: selectedLocale,
      });
      setDevicePushState(await readDevicePushState());
      if (result.outcome === 'not_registered') {
        setErrorMessageKey('errors.generic');
      }
    } catch (error) {
      console.warn('Could not enable push from the notification settings banner', error);
      setErrorMessageKey('errors.generic');
    } finally {
      setDevicePushBannerBusy(false);
    }
  }, [devicePushState, requestContext, selectedLocale]);
```

8. Render. Directly after the apply `ConfirmDialog` (the one with
   `testID="more-settings-notifications-apply-dialog"`), add the guide:

```tsx
      <ConfirmDialog
        body={t('settings.notifications.device_push_blocked_mobile_body')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="more-settings-device-push-blocked-cancel"
        confirmLabel={t('settings.notifications.open_system_settings')}
        confirmTestID="more-settings-device-push-blocked-open-settings"
        onCancel={() => {
          setBlockedGuidanceVisible(false);
        }}
        onConfirm={() => {
          setBlockedGuidanceVisible(false);
          void openSystemNotificationSettings().catch(() => {
            setErrorMessageKey('errors.generic');
          });
        }}
        testID="more-settings-device-push-blocked-dialog"
        title={t('settings.notifications.device_push_blocked_title')}
        visible={blockedGuidanceVisible}
      />
```

   and as the first element inside `<View style={styles.cardStack}>`, before the
   `more-settings-notification-when-subscribe-card` `Card`:

```tsx
        {showDevicePushBanner ? (
          <WarningBanner
            actionLabel={t('settings.notifications.device_push_banner_action')}
            actionLoading={devicePushBannerBusy}
            actionTestID="more-settings-device-push-banner-action"
            message={t('settings.notifications.device_push_banner_message')}
            onAction={() => {
              void handleDevicePushBannerAction();
            }}
            testID="more-settings-device-push-banner"
          />
        ) : null}
```

### `apps/mobile/e2e/scripts/push-device-fixture.js` (new)

The banner needs a push device on the account. The E2E seed creates none, and a simulator or
emulator cannot be relied on for a real push token, so the flow registers a placeholder FCM device
through the E2E API, the way `scripts/playback-other-device.js` stands in for a second device.
`POST /account/fcm-device/create` takes `fcm_token`, `installation_id`, and `platform`
(`AccountFCMDevicePlatformEnum`: `web`, `android`, `ios`) and requires membership, which the seeded
user has. `DELETE /account/fcm-device/delete` deletes by `installation_id` and by `fcm_token`, and
succeeds when no row matches. Nothing is delivered to the placeholder token.

```javascript
// Registers a placeholder FCM device on the seeded account, so a flow can open notification
// settings as an account that turned push on from another device. A simulator cannot be relied on
// for a real push token, so the device comes from the API. Nothing is ever delivered to it.
//
// Runs on the host JVM (not the device), so `localhost` is correct for both iOS and Android runs.
// Requires the Mobile E2E API on :4230 and the web E2E seed fixtures.
//
// Each run signs in as its own session and deletes that session before it ends, so the account's
// session list is unchanged. add first clears a device or session left by an interrupted run.
//
// Env (via `runScript: { env: ... }`):
//   E2E_PUSH_DEVICE_ACTION   add or remove. Required.

const optional = (value, fallback) =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const API_BASE_URL = optional(
  typeof E2E_API_BASE_URL !== 'undefined' ? E2E_API_BASE_URL : null,
  'http://localhost:4230/api/v2'
);
const LOGIN_EMAIL = optional(
  typeof E2E_LOGIN_EMAIL !== 'undefined' ? E2E_LOGIN_EMAIL : null,
  'e2e-user@example.com'
);
const LOGIN_PASSWORD = optional(
  typeof E2E_LOGIN_PASSWORD !== 'undefined' ? E2E_LOGIN_PASSWORD : null,
  'Test!1Aa'
);
const ACTION = optional(
  typeof E2E_PUSH_DEVICE_ACTION !== 'undefined' ? E2E_PUSH_DEVICE_ACTION : null,
  ''
);

const SESSION_LABEL = 'E2E Push Device Fixture';
const FIXTURE_INSTALLATION_ID = 'e2e-push-device-fixture';
const FIXTURE_FCM_TOKEN = 'e2e-push-device-fixture-token';
// AccountFCMDevicePlatformEnum.Android. This script runs in Maestro's JavaScript and cannot import
// the enum.
const FIXTURE_PLATFORM = 'android';

if (ACTION !== 'add' && ACTION !== 'remove') {
  throw new Error('push-device-fixture: E2E_PUSH_DEVICE_ACTION must be add or remove');
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const authHeaders = (accessToken) =>
  Object.assign({}, JSON_HEADERS, { Authorization: `Bearer ${accessToken}` });

const failOn = (label, response) => {
  if (!response.ok) {
    throw new Error(`push-device-fixture: ${label} failed (${response.status}) ${response.body}`);
  }
};

const login = () => {
  const response = http.post(`${API_BASE_URL}/auth/mobile/token`, {
    headers: JSON_HEADERS,
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
      device_label: SESSION_LABEL,
    }),
  });
  failOn('mobile token', response);
  const accessToken = json(response.body).access_token;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('push-device-fixture: mobile token response had no access_token');
  }
  return accessToken;
};

const deleteFixtureDevice = (accessToken) => {
  const response = http.request(`${API_BASE_URL}/account/fcm-device/delete`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      fcm_token: FIXTURE_FCM_TOKEN,
      installation_id: FIXTURE_INSTALLATION_ID,
    }),
  });
  failOn('delete fixture device', response);
};

const createFixtureDevice = (accessToken) => {
  const response = http.post(`${API_BASE_URL}/account/fcm-device/create`, {
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      fcm_token: FIXTURE_FCM_TOKEN,
      installation_id: FIXTURE_INSTALLATION_ID,
      platform: FIXTURE_PLATFORM,
    }),
  });
  failOn('create fixture device', response);
};

const deleteSession = (accessToken, idText, label) => {
  const response = http.request(`${API_BASE_URL}/auth/sessions/${encodeURIComponent(idText)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  failOn(label, response);
};

const endFixtureSessions = (accessToken) => {
  const response = http.get(`${API_BASE_URL}/auth/sessions`, {
    headers: authHeaders(accessToken),
  });
  failOn('list sessions', response);
  const rows = json(response.body).rows;
  if (!Array.isArray(rows)) {
    throw new Error('push-device-fixture: sessions response had no rows array');
  }
  const current = rows.find((row) => row && row.is_current === true);
  if (
    current === undefined ||
    typeof current.id_text !== 'string' ||
    current.id_text.length === 0
  ) {
    throw new Error('push-device-fixture: sessions response had no current id_text');
  }
  rows.forEach((row) => {
    if (!row || row.is_current === true || row.device_label !== SESSION_LABEL) {
      return;
    }
    deleteSession(accessToken, row.id_text, `delete leftover ${row.id_text}`);
  });
  deleteSession(accessToken, current.id_text, 'end session');
};

const accessToken = login();
deleteFixtureDevice(accessToken);
if (ACTION === 'add') {
  createFixtureDevice(accessToken);
}
endFixtureSessions(accessToken);
```

### `apps/mobile/e2e/notifications-inbox.yaml`

Maestro's `launchApp` grants every permission unless told otherwise, so the earlier steps of this
flow run with notifications allowed and no banner. Append this segment at the end of the file,
after `- takeScreenshot: more-settings-banner-notifications`. It registers the placeholder device,
relaunches with the session kept and notifications denied (the same relaunch shape as
`playback-resume-on-relaunch.yaml`), and removes the device at the end. The device must exist
before the relaunch, because the screen checks the account's devices when it mounts.

```yaml

# Denied notifications on this device, with Push on for the account's media categories by default
# and a push device registered elsewhere on the account: notification settings opens with the
# device push banner at the top.
- runScript:
    file: scripts/push-device-fixture.js
    env:
      E2E_PUSH_DEVICE_ACTION: add
- launchApp:
    clearState: false
    permissions:
      notifications: deny
- runFlow: shared/connect-dev-client.yaml
- tapOn:
    id: tab-more
- tapOn:
    id: more-settings
- assertVisible:
    id: more-settings-screen
- tapOn:
    id: more-settings-notifications
- extendedWaitUntil:
    visible:
      id: more-settings-device-push-banner
    timeout: ${TIMEOUT_SLOW}
- assertVisible:
    id: more-settings-device-push-banner-action
- takeScreenshot: more-settings-device-push-banner
- runScript:
    file: scripts/push-device-fixture.js
    env:
      E2E_PUSH_DEVICE_ACTION: remove
```

Do not tap the banner button in the flow: on Android a denied-but-askable permission would raise the
system prompt, and on iOS the guide opens system settings, which leaves the app. Also extend the
comment block at the top of the file with one sentence: "With notifications denied and a push
device registered elsewhere on the account, notification settings opens with the device push
banner at the top." The next flow's `launchApp` with `clearState: true` restores the default
permissions.

If the flow fails between `add` and `remove`, the placeholder device stays on the account until the
next run of this flow, whose `add` clears it first. Until then, other flows see an account with a
push device: an In-App Only answer to the first-Subscribe prompt leaves media push on, and the
sign-in dialog is still not offered because Maestro allows notifications by default.

## Reuse

- `shouldShowDevicePushBanner` (plan 10); `accountHasAnyPushDevice`, `readDevicePushState`,
  `enablePushOnThisDevice`, and the Android notification page in `openSystemNotificationSettings`
  (plan 30).
- `ConfirmDialog`, `Button`, the warning tokens, and the existing `more-settings-error` line.
- Catalog keys `device_push_banner_message`, `device_push_banner_action`,
  `device_push_blocked_title`, `device_push_blocked_mobile_body` (plan 11), and existing
  `settings.notifications.open_system_settings` and `misc.cancel`. No new keys.
- The fixture script copies the sign-in, session cleanup, and `http` helpers of
  `apps/mobile/e2e/scripts/playback-other-device.js`.

## Tests

- Device flow: the `notifications-inbox.yaml` segment above, with
  `scripts/push-device-fixture.js` registering the account's push device (banner and its button
  visible, with a screenshot).
- No unit test: the show rule, including the device requirement, is plan 10's tested helper; the
  state mapping is plan 30's tested resolver; `accountHasAnyPushDevice` is an existing function
  plan 30 only exports. What remains is wiring the flow covers.
- No test references the removed lower hint (plan 30 confirms it), so nothing here changes for it.

## Release scratchpad

```markdown
## Mobile notification settings warns when this phone lacks push permission

- Surfaces: mobile
- Change: More › Settings › Notifications opens with a warning-colored banner at the top when the
  account already has a push device registered somewhere (FCM, Web Push, or Unified Push), has
  Push on for at least one category, and this phone has not allowed notifications. A new account
  with only the default category settings and no push device does not see it. "Allow on This
  Device" shows the system prompt while the phone can still ask. Once the system will not ask
  again, it opens a short guide whose "Open System Settings" button goes straight to Podverse's
  own notification settings page on Android (falling back to the app info page if the phone
  refuses that page) or to Podverse's page in Settings on iOS. Returning from system settings with
  notifications allowed registers the phone right away. The banner replaces the lower
  "permission required" hint (separate entry).
- Who notices: members who use push on another device, on a phone that never allowed, or later
  blocked, notifications
- Operator steps: none
```
