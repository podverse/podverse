**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 21 — Web: ask once after signing in when push is on for the account

After someone signs in on a browser, if this account has never been shown this dialog in this
browser, at least one notification category has Push on, the account has a push device somewhere,
and this browser can still ask for permission, show a short dialog once: **Enable Push** asks the
browser for permission and registers this browser; **Not Now** only closes it. Neither answer
changes category settings. The "shown" flag is written when the dialog opens.

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

R7, R8, R9

## Runs after

10, 11, 20

## Files

apps/web/src/components/Modal/ModalAuthLogin.tsx
apps/web/src/components/Auth/SignInPushPrompt.tsx
apps/web/src/components/App/AppChrome.tsx
apps/web/e2e/sign-in-push-prompt.spec.ts

## Every web sign-in path

`ModalAuthLogin` is the only place the web app starts a session. It calls `reqAuthLogin`, which
hits the API's `authenticate` (`apps/api/src/lib/auth/index.ts`, `completeWebLogin`), and then
reloads the page. The other auth screens do not sign in:

- `AuthSignUpForm` creates the account and shows "check your email".
- `VerifyEmailPageClient` verifies the address and redirects to `/` signed out
  (`AccountController.verifyEmail` sets no cookie).
- `AuthResetPasswordForm` and `SetPasswordPageClient` change the password and send the person to
  log in (set-password clears the auth cookie).

So "right after they sign in" (R9) is: the first fully rendered page after `ModalAuthLogin`'s
reload. A page load of an already signed-in session never asks.

## How the trigger survives the reload

`ModalAuthLogin` sets the pending flag from plan 20 just before `window.location.reload()`. The
next page load mounts `SignInPushPrompt` inside `AppChrome`, which takes (reads and clears) the
flag once on mount. `AppChrome` renders the Terms or Taste Profile gate instead of the app when
one is required; the prompt is not mounted there, so the flag waits in `sessionStorage` until the
person finishes the gate and the app renders. A sign-in that never shows the dialog (push off, no
device, permission blocked) writes nothing to `localStorage`, so a later sign-in can still ask.

## Implementation

### `apps/web/src/components/Modal/ModalAuthLogin.tsx`

Import `markSignInPushPromptPending` from `'../../lib/notifications/signInPushPrompt'`. In
`handleSubmit`, call it between the successful `reqAuthLogin` and the reload:

```typescript
      await getApiRequestService().reqAuthLogin({ email, password });
      markSignInPushPromptPending();
      window.location.reload();
```

No other change in this file.

### `apps/web/src/components/Auth/SignInPushPrompt.tsx` (new)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { shouldOfferSignInPushPrompt } from '@podverse/helpers';
import { Button, Modal } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useNotifications } from '../../contexts/Notifications';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMembershipGate } from '../../hooks/useMembershipGate';
import { useWebDevicePushState } from '../../hooks/useWebDevicePushState';
import { accountHasAnyPushDevice } from '../../lib/notifications/firstSubscribePushPrompt';
import {
  hasShownSignInPushPrompt,
  markSignInPushPromptShown,
  takeSignInPushPromptPending,
} from '../../lib/notifications/signInPushPrompt';
import { requestNotificationPermission } from '../../lib/notifications/webpush/requestNotificationPermission';
import { shouldShowServerEnvironmentDisclaimer } from '../Modal/serverEnvironmentDisclaimer';

/** The one-time push dialog on the first page load after signing in on this browser. */
export function SignInPushPrompt() {
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');
  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const { serverEnvironmentDisclaimerAccepted } = useLocalSettings();
  const { refreshWebPushRegistration } = useNotifications();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const { devicePushState, isChecked } = useWebDevicePushState();
  const [signInPending, setSignInPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const evaluatedRef = useRef(false);
  const busyRef = useRef(false);
  const accountIdText = loggedInAccount?.id_text ?? null;
  const showDisclaimer =
    shouldShowServerEnvironmentDisclaimer(config.public.server_env) &&
    !serverEnvironmentDisclaimerAccepted;

  useEffect(() => {
    setSignInPending(takeSignInPushPromptPending());
  }, []);

  useEffect(() => {
    if (
      !signInPending ||
      evaluatedRef.current ||
      accountIdText === null ||
      !isChecked ||
      showDisclaimer
    ) {
      return;
    }
    evaluatedRef.current = true;
    const signInPushPromptShown = hasShownSignInPushPrompt(accountIdText);
    if (signInPushPromptShown || devicePushState !== 'can_request') {
      return;
    }
    void (async () => {
      try {
        const [preferences, accountHasPushDevice] = await Promise.all([
          getApiRequestService().reqNotificationPreferencesGet(),
          accountHasAnyPushDevice(),
        ]);
        if (
          shouldOfferSignInPushPrompt({
            accountHasPushDevice,
            devicePushState,
            preferences,
            signInPushPromptShown,
          })
        ) {
          setIsOpen(true);
        }
      } catch (error) {
        console.warn('Could not decide whether to offer push after sign-in', error);
      }
    })();
  }, [accountIdText, devicePushState, isChecked, showDisclaimer, signInPending]);

  useEffect(() => {
    if (isOpen && accountIdText !== null) {
      markSignInPushPromptShown(accountIdText);
    }
  }, [accountIdText, isOpen]);

  const close = () => {
    if (busyRef.current) {
      return;
    }
    setIsOpen(false);
  };

  const enablePush = async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setIsBusy(true);
    try {
      await requestNotificationPermission();
    } catch (error) {
      if (!tryHandleMembershipGateError(error)) {
        console.warn('Could not enable push after sign-in', error);
      }
    } finally {
      await refreshWebPushRegistration();
      busyRef.current = false;
      setIsBusy(false);
      setIsOpen(false);
    }
  };

  const title = tSettings('notifications.sign_in_push_prompt_title');

  return (
    <Modal
      ariaLabel={title}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={title}
      isOpen={isOpen}
      onClose={close}
    >
      <Modal.Body>
        <p>{tSettings('notifications.sign_in_push_prompt_body')}</p>
      </Modal.Body>
      <Modal.Actions>
        <Button disabled={isBusy} onClick={close} type="button" variant="secondary">
          {tSettings('notifications.sign_in_push_prompt_not_now')}
        </Button>
        <Button
          disabled={isBusy}
          isLoading={isBusy}
          onClick={() => {
            void enablePush();
          }}
          type="button"
          variant="primary"
        >
          {tSettings('notifications.sign_in_push_prompt_enable')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
```

Notes for the implementer, all settled:

- The early `return` before the requests repeats two of `shouldOfferSignInPushPrompt`'s conditions
  only to skip four API calls when the answer is already no. Keep the helper call as the decision.
- `markSignInPushPromptShown` runs from the `isOpen` effect, so the flag is written only once the
  dialog is presented, for either answer.
- The close button, Escape, and **Not Now** all call `close`. They are the same answer.
- `requestNotificationPermission` already shows the browser prompt, registers the service worker,
  and creates or updates this browser's web push device. It rethrows only a membership 403, which
  `tryHandleMembershipGateError` turns into the shared membership modal. It never touches Unified
  Push or category preferences.
- The dialog waits while the server-environment disclaimer is open, so two dialogs never stack.
- Match `SubscribeButton.tsx` for the `Modal` shape (`Modal.Body` then `Modal.Actions`, secondary
  first, primary last), per **modal-layout-contract**.
- If `Button` has no `isLoading` prop in this version of `@podverse/ui`, drop it and keep
  `disabled`.

### `apps/web/src/components/App/AppChrome.tsx`

Import `SignInPushPrompt` from `'../Auth/SignInPushPrompt'` and render it directly after
`<SessionEndedNotice />` inside `WindowWrapper`:

```tsx
        <SessionEndedNotice />
        <SignInPushPrompt />
```

It sits only in the full-chrome branch, so embeds and the Terms and Taste Profile gates never
mount it.

## Tests

New `apps/web/e2e/sign-in-push-prompt.spec.ts`, following **e2e-readability** (full-sentence test
and step names) and **e2e-screenshot-verified-element** (pass the verified element to the capture
helper). Use `capturePageLoad` / `actionAndCapture` from `./helpers/stepScreenshots` and the helpers
from `./helpers/webPushPermission` (plan 20). Sign in through the UI, because only the login modal
sets the pending flag:

```typescript
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

async function signInThroughLoginModal(page: Page): Promise<void> {
  const chrome = page.locator('[data-appearance="web"]');
  await chrome.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Login' }).click();
  const dialog = page.getByRole('dialog', { name: 'Login' });
  await dialog.getByLabel('Email or Username').fill(LOGIN_EMAIL);
  await dialog.getByLabel('Password').fill(LOGIN_PASSWORD);
  await dialog.getByRole('button', { name: 'Submit' }).click();
  await expect(chrome.getByRole('button', { name: 'Account' })).toBeVisible();
}
```

If `getByLabel` does not resolve the inset `eyebrow` inputs, use
`dialog.locator('input[name="email"]')` and `dialog.locator('input[name="password"]')`.

The dialog name is `Turn On Push Notifications on This Device?`. Read the account's flag with:

```typescript
async function readSignInPushPromptShownFlags(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) =>
      key.startsWith('notifications.sign_in_push_prompt_shown:')
    )
  );
}
```

Each test calls, before the first `page.goto('/podcasts')`:
`stubBrowserNotificationPermission(page, { permission: 'default', requestResult: 'denied' })`
(except where stated), `mockNotificationPreferences(page, { pushEnabledCategories: ['new-content'] })`
(except where stated), and `mockAccountPushDevices(page, …)`. After the first `goto`, call
`expectWebPushConfigured(page)`.

1. **"When push is on for the account and another device has push, the first page after signing
   in asks once, and Enable Push asks the browser for permission."**
   Devices: `{ otherBrowserWebPushDevices: 1, unifiedPushDevice: false }`. Sign in. The dialog is
   visible with both buttons; capture it. One `notifications.sign_in_push_prompt_shown:` key
   exists. Click **Enable Push**: the dialog closes and `readRequestPermissionCalls(page)` is 1.
   Reload: the dialog does not appear (`toHaveCount(0)` after the Account button is visible).
1. **"Not Now closes the dialog without asking the browser, and signing in again does not ask
   again."**
   Same mocks. Sign in, click **Not Now**: the dialog closes and `readRequestPermissionCalls` is 0.
   Sign out (Account button → menuitem **Logout**, then wait for menuitem **Login** to be
   available), sign in again: the dialog does not appear.
1. **"When the account has no push device anywhere, signing in does not ask and records nothing."**
   Devices: `{ otherBrowserWebPushDevices: 0, unifiedPushDevice: false }`. Sign in. After the
   Account button is visible, the dialog has count 0 and `readSignInPushPromptShownFlags` is `[]`.
1. **"When no notification category has Push on, signing in does not ask."**
   Preferences: `{ pushEnabledCategories: [] }`, devices with one other-browser device. Sign in:
   no dialog, no flag.
1. **"When this browser has blocked notifications, signing in does not ask."**
   Stub `{ permission: 'denied', requestResult: 'denied' }`, one other-browser device, push on.
   Sign in: no dialog, no flag.

For the "does not appear" checks, wait for `page.waitForLoadState('networkidle')` after the
Account button is visible, then assert count 0, so the async decision has finished.

No unit test: the decision is `shouldOfferSignInPushPrompt` (tested in plan 10) and the storage is
tested in plan 20.

## Release scratchpad

```markdown
## Web asks for push once after signing in on a new browser

- Surfaces: web
- Change: on the first page after signing in, a browser that has not granted notification
  permission shows a one-time dialog (Enable Push / Not Now) when at least one notification
  category has Push on and the account already has a push device on another browser or phone.
  Enable Push opens the browser permission prompt and registers this browser; Not Now only closes
  it. Neither answer changes notification settings. The dialog is remembered per account in this
  browser and never shows on later page loads of the same session.
- Who notices: people who turned on push on one device and then sign in on another browser
- Operator steps: none
```
