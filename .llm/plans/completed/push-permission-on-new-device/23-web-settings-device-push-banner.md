**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 23 — Web: warning banner at the top of notification settings when this browser lacks push

At the very top of the Notifications settings tab, a warning banner (not danger) appears when the
account already has a registered push device somewhere (FCM, Web Push, or Unified Push), at least
one notification category has Push on, and this browser can be turned on but is not: permission
not yet granted, permission granted but this browser not registered, or permission blocked. It
never shows when the account has no push device (a new account with only the seeded defaults),
when no category has Push on, when this browser already receives push, or when this browser cannot
receive push. Its button asks the browser again; when the browser has blocked notifications and
will not show its prompt, the button opens a short guide instead.

The banner is the shared `Banner` from `@podverse/ui` with the `warning` variant plan 24 adds. This
plan adds no styles.

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

R14, R15, R16, R17, R18, R19, R34

## Runs after

10, 11, 20, 24

## Files

apps/web/src/components/Settings/Panels/SettingsNotifications/DevicePushBanner.tsx
apps/web/src/components/Settings/Panels/SettingsNotifications/SettingsNotifications.tsx
apps/web/e2e/settings-notifications.spec.ts

## When the banner shows (R15, R34)

`shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState, preferences })` from plan 10
decides. This plan supplies:

- `accountHasPushDevice`: `accountHasAnyPushDevice()` from
  `apps/web/src/lib/notifications/firstSubscribePushPrompt.ts`, which plan 20 exports. It is true
  when the account has any FCM device, any web push device, or a Unified Push device. Plan 21's
  sign-in dialog calls the same function; do not write another copy.
- `devicePushState` and `isChecked`: `useWebDevicePushState()` (plan 20).
- `preferences`: the rows `SettingsNotifications` already loads.

An account with a Unified Push device reads as `enabled` in every browser (plan 20), so the banner
never shows for it, and its button never runs `enableWebPush` for that account. That keeps
`enableWebPush`'s step that deletes the account's Unified Push device from running from here.

## Where people turn push on manually (R14)

The settings tab already has the manual path the request describes: the **Web Push** switch and
each category's **Push** switch call `enableWebPush` in `usePushChannelControls.ts`, which opens the
browser prompt and registers this browser. The banner adds a direct button at the top and explains
why the Push switches read off on this browser.

## Banner button behavior (R16, R19)

| This browser's state when pressed | Button does |
| --- | --- |
| `can_request` | Calls the existing `enableWebPush` from `usePushChannelControls` (browser prompt, register, refresh state). On success the state becomes `enabled` and the banner disappears. |
| `blocked` | Opens a modal titled **Notifications Are Blocked** with the browser guidance text and one **OK** button. |

A web page cannot reopen a prompt the browser has blocked and cannot open the browser's site
settings, so web gives guidance only (plan 11 wrote the copy for that). If the person blocks at the
prompt the button opened, the banner stays, now `blocked`, and the next press opens the guide.

## Implementation

### `apps/web/src/components/Settings/Panels/SettingsNotifications/DevicePushBanner.tsx` (new)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { NotificationPushPreferenceRow } from '@podverse/helpers';
import { shouldShowDevicePushBanner } from '@podverse/helpers';
import { Banner, Button, Modal } from '@podverse/ui';

import { useAccount } from '../../../../contexts/Account';
import { useWebDevicePushState } from '../../../../hooks/useWebDevicePushState';
import { accountHasAnyPushDevice } from '../../../../lib/notifications/firstSubscribePushPrompt';
import { SettingsSection } from '../../SettingsSection';

type DevicePushBannerProps = {
  enableWebPush: () => Promise<void>;
  loadingWebPush: boolean;
  preferences: readonly NotificationPushPreferenceRow[];
};

/** Warns that push is on for the account but this browser cannot show it yet. */
export function DevicePushBanner({
  enableWebPush,
  loadingWebPush,
  preferences,
}: DevicePushBannerProps) {
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const accountIdText = loggedInAccount?.id_text;
  const { devicePushState, isChecked } = useWebDevicePushState();
  const [accountHasPushDevice, setAccountHasPushDevice] = useState<boolean | null>(null);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);

  useEffect(() => {
    if (!accountIdText) {
      setAccountHasPushDevice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const hasDevice = await accountHasAnyPushDevice();
        if (!cancelled) {
          setAccountHasPushDevice(hasDevice);
        }
      } catch (error) {
        console.warn('Could not check the account push devices for the settings banner', error);
        if (!cancelled) {
          setAccountHasPushDevice(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountIdText, devicePushState]);

  if (
    !isChecked ||
    accountHasPushDevice === null ||
    !shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState, preferences })
  ) {
    return null;
  }

  const allowOnThisDevice = () => {
    if (devicePushState === 'blocked') {
      setIsGuidanceOpen(true);
      return;
    }
    void enableWebPush();
  };

  const guidanceTitle = tSettings('notifications.device_push_blocked_title');

  return (
    <>
      <SettingsSection>
        <div data-testid="settings-notifications-device-push-banner">
          <Banner
            action={
              <Button
                disabled={loadingWebPush}
                isLoading={loadingWebPush}
                onClick={allowOnThisDevice}
                type="button"
                variant="warning"
              >
                {tSettings('notifications.device_push_banner_action')}
              </Button>
            }
            message={tSettings('notifications.device_push_banner_message')}
            role="status"
            variant="warning"
          />
        </div>
      </SettingsSection>
      <Modal
        ariaLabel={guidanceTitle}
        closeButtonAriaLabel={tMisc('close_modal')}
        header={guidanceTitle}
        isOpen={isGuidanceOpen}
        onClose={() => setIsGuidanceOpen(false)}
      >
        <Modal.Body>
          <p>{tSettings('notifications.device_push_blocked_web_body')}</p>
        </Modal.Body>
        <Modal.Actions>
          <Button onClick={() => setIsGuidanceOpen(false)} type="button" variant="primary">
            {tMisc('ok')}
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}
```

Settled details:

- The banner waits for `isChecked` and for the device check, and `preferences` starts empty while
  the panel loads them, so it never flashes on a browser that already receives push or for an
  account with no push device.
- The device check runs again when `devicePushState` changes, so registering or unregistering this
  browser from the switches below updates whether the account has a push device.
- `role="status"` matches `MembershipExpiredBanner`, which also wraps `Banner` in a `div` carrying
  its `data-testid`. The banner appears after async checks, so a screen reader announces it. The
  button has visible text. There is no icon; `Banner` has no icon slot and the message names the
  problem.
- `SettingsSection` gives the banner the same `--spacing-2xl` bottom margin every section on this
  tab has, so the gap above **When I Subscribe** matches the other section gaps
  (**even-content-spacing**). No app SCSS file is added.
- `Button` in `@podverse/ui` has `isLoading` and a `warning` variant.

### `apps/web/src/components/Settings/Panels/SettingsNotifications/SettingsNotifications.tsx`

1. Import `DevicePushBanner` from `'./DevicePushBanner'`, next to the existing
   `usePushChannelControls` import.
1. Make the banner the first element of the returned fragment, above the **When I Subscribe**
   `SettingsSection`:

```tsx
  return (
    <>
      <DevicePushBanner
        enableWebPush={enableWebPush}
        loadingWebPush={loadingWebPush}
        preferences={preferences}
      />
      <SettingsSection>
        <h3 className={styles.preferencesHeading}>
          {tSettings('notifications.when_i_subscribe_section')}
```

No other change in this file. `enableWebPush`, `loadingWebPush`, and `preferences` are already in
scope. After a category's Push switch is turned off, `setPreferences(updated)` re-renders the
banner, so it hides as soon as no category has Push on.

## Tests

Extend `apps/web/e2e/settings-notifications.spec.ts` with a new
`test.describe('Settings: device push banner', …)` after the existing describe. Reuse the file's
`loginSeedUser`. Use the helpers from `./helpers/webPushPermission` (plan 20) and
`capturePageLoad` / `actionAndCapture`. Follow **e2e-readability** and
**e2e-screenshot-verified-element**.

Shared setup in each test, before `page.goto('/settings?tab=notifications')`:
`loginSeedUser(page)`, `stubBrowserNotificationPermission(…)`,
`mockNotificationPreferences(…)`, `mockAccountPushDevices(…)`. After the `goto`, call
`expectWebPushConfigured(page)` and wait for the **When I Subscribe** heading.

`const banner = page.getByTestId('settings-notifications-device-push-banner');`

1. **"When the account has a push device elsewhere, push is on, and this browser has not allowed
   notifications, a warning banner sits at the top of the notifications tab and its button asks the
   browser."**
   Stub `{ permission: 'default', requestResult: 'denied' }`; preferences
   `{ pushEnabledCategories: ['new-content'] }`; devices
   `{ otherBrowserWebPushDevices: 1, unifiedPushDevice: false }`. The banner is visible and shows
   **Push notifications are turned on for your account, but this device doesn't have permission to
   show them.** The banner's `boundingBox().y` is less than the **When I Subscribe** heading's.
   Capture the banner. Click **Allow on This Device**: `readRequestPermissionCalls(page)` becomes 1
   (`expect.poll`).
1. **"When this browser has blocked notifications, the banner's button explains how to allow them
   in the browser."**
   Stub `{ permission: 'denied', requestResult: 'denied' }`, same preferences and devices as
   case 1. Click **Allow on This Device**: a dialog named **Notifications Are Blocked** shows the
   guidance text starting **This browser is blocking notifications for this site.**; capture the
   dialog. `readRequestPermissionCalls(page)` is 0. Click **OK**: the dialog closes and the banner
   is still visible.
1. **"When the account has no push device anywhere, the banner does not appear, even with push on."**
   Stub `default`; preferences with `new-content`; devices
   `{ otherBrowserWebPushDevices: 0, unifiedPushDevice: false }`. After the heading is visible and
   `networkidle`, the banner has count 0.
1. **"When no notification category has Push on, the banner does not appear."**
   Stub `default`; preferences `{ pushEnabledCategories: [] }`; devices
   `{ otherBrowserWebPushDevices: 1, unifiedPushDevice: false }`. After the heading is visible and
   `networkidle`, the banner has count 0.
1. **"When the account receives push through Unified Push, the banner does not appear."**
   Stub `default`; preferences with `new-content`; devices
   `{ otherBrowserWebPushDevices: 0, unifiedPushDevice: true }`. After `networkidle`, the banner
   has count 0.

The existing tests in this file keep working unchanged: they do not mock the device routes, the
seeded user has no push device, so the banner does not render there.

## Release scratchpad

```markdown
## Web notification settings warn when this browser lacks push

- Surfaces: web, packages/ui
- Change: the Notifications settings tab shows a warning banner at the very top when the account
  already has a push device registered somewhere (a phone, another browser, or Unified Push), at
  least one notification category has Push on, and this browser has not allowed notifications (or
  is not registered). Its "Allow on This Device" button opens the browser permission prompt and
  registers this browser. When the browser has blocked notifications, the button shows how to
  allow them from the site settings next to the address bar. The banner is hidden for accounts
  with no push device (new accounts with the default settings), when no category has Push on,
  when this browser already receives push, when the account uses Unified Push, and on browsers
  that cannot receive push. The shared `Banner` component gained a `warning` variant (warning
  tint and border from the theme) for this banner and any later warning banner.
- Who notices: signed-in people who turned on push on another device and open notification
  settings on a browser without push permission
- Operator steps: none
```
