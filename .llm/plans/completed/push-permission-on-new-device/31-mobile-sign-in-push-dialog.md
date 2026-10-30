**Cursor model:** Opus 5.5 · **Reasoning:** high

# 31 — Mobile: ask once to allow push right after signing in on this device

Right after a person signs in on this phone, when their account has Push on for at least one
category and a push device somewhere, and this phone can still show the system prompt, show one
dialog: "Turn On Push Notifications on This Device?" with Enable Push and Not Now. Enable Push shows
the system prompt and registers this phone. Not Now only records that the dialog was shown. Neither
answer changes category settings. Opening the app while already signed in never shows it.

The lifecycle choices below are settled; the timing is the part to get right.

## Rows

R20, R21, R22

## Runs after

10, 11, 30

## Files

apps/mobile/src/terms/accountConsentSettled.ts
apps/mobile/src/terms/TermsAcceptanceProvider.tsx
apps/mobile/src/lib/notifications/signInPushPrompt.ts
apps/mobile/src/lib/notifications/signInPushPrompt.test.ts
apps/mobile/src/notifications/SignInPushPromptHost.tsx
apps/mobile/App.tsx

## Every mobile sign-in path

`completeMobilePasswordLogin` (`src/auth/completeMobilePasswordLogin.ts`) is the only place a session
starts. Its callers are `LoginScreen` (the auth sheet) and `E2eQuickLogin`, which first calls
`clearSession('user_logout')` when already signed in. Sign-up does not sign in. So every sign-in is
an `anonymous` → `authenticated` change of `useAuth().status`, and a cold start with a saved session
is `unknown` → `authenticated`. The host watches that change itself.

The sync layer cannot tell the two apart: `SyncProvider` also sends `requestSync('sign-in')` when
the terms gate opens on a cold start, so neither the `'sign-in'` trigger nor `planSyncRun` is used.

## When the dialog may appear

Sign-in sets a pending mark for this session. The check runs once, when all of these hold:

1. The mark is set and `status === 'authenticated'`.
2. `account !== null`. `status` turns `authenticated` before the account snapshot lands
   (**mobile-anonymous-vs-account-features**); a null account means "not known yet", so wait.
3. `evaluateFeature('notifications').allowed`. Notifications are a Membership feature; for anyone
   else the mark is dropped and the dialog never shows (and is not recorded as shown).
4. Account consent is settled: no Terms, account access, or Taste Profile screen is up or about to
   come up. That screen is a full-screen RN `Modal`, and `OverlayOutlet` (where `ConfirmDialog`
   renders) sits beneath it, so a dialog presented earlier would be hidden under it.
   `TermsAcceptanceProvider` publishes this through a new module store, in the same shape as
   `termsSyncGate.ts`.

The mark is consumed as the check starts, so one sign-in runs one check. Sign-out drops the mark
and hides the dialog.

The check reads the shown flag and this device's state first, and stops without a request unless
the state is `can_request` and the flag is unset. Only then does it load the preferences and the
account's push devices, and it asks plan 10's `shouldOfferSignInPushPrompt`. The check runs
directly, not through the sync queue: it is the tail of the sign-in the person just did (the
interactive lane in **mobile-sync-orchestration**), the same as the terms load. A failure logs a
warning and shows nothing.

The flag is written right after `visible` becomes true, for either answer (plan 10). A `blocked`
or `unsupported` device never presents and never writes it.

The auth sheet is already fading out when the check starts (it is visible only while `anonymous`),
and the check waits on at least one network round trip for consent plus its own requests, so it does
not present while that sheet dismisses. `ConfirmDialog` is an `AppOverlay`, not a full-screen
`Modal`, so **mobile-modal-presentation-lifecycle**'s dismiss-and-present conflict does not apply to
it.

## Implementation

### `apps/mobile/src/terms/accountConsentSettled.ts` (new)

```typescript
let settled = false;
const listeners = new Set<() => void>();

/**
 * True while a signed-in account has its snapshot and no Terms, account access, or Taste Profile
 * screen is up or still deciding whether to come up. Prompts that follow a sign-in wait for it so
 * they never open beneath that full-screen screen.
 */
export function isAccountConsentSettled(): boolean {
  return settled;
}

export function setAccountConsentSettled(next: boolean): void {
  if (settled === next) {
    return;
  }
  settled = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAccountConsentSettled(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
```

### `apps/mobile/src/terms/TermsAcceptanceProvider.tsx`

1. Import `setAccountConsentSettled` from `./accountConsentSettled`, next to the
   `setTermsBlocksAccountSync` import.
2. Directly after the `tasteProfileAgreementBodyLoading` const, add:

```typescript
  // Until the Taste Profile agreement loads or fails, `phase` can still move off 'none'.
  const consentSettled =
    status === 'authenticated' &&
    account !== null &&
    !blockSync &&
    phase === 'none' &&
    (tasteProfileAgreementVersion !== '' || tasteProfileAgreementLoadFailed);
```

3. Directly after the `useEffect` that calls `setTermsBlocksAccountSync(blockSync)`, add:

```typescript
  useEffect(() => {
    setAccountConsentSettled(consentSettled);
    return () => {
      setAccountConsentSettled(false);
    };
  }, [consentSettled]);
```

The Taste Profile agreement effect loads for every decision once `blockSync` is false, so
`consentSettled` always resolves for a signed-in account. Nothing else in the provider changes.

### `apps/mobile/src/lib/notifications/signInPushPrompt.ts` (new)

Reads are injected so vitest runs this in node. Do not import anything from `src/push`,
`src/data`, or `src/auth` here.

```typescript
import type {
  DevicePushState,
  NotificationPushPreferenceRow,
} from '@podverse/helpers/notificationPush';
import { shouldOfferSignInPushPrompt } from '@podverse/helpers/notificationPush';

export type SignInPushPromptReads = {
  readAccountHasPushDevice: () => Promise<boolean>;
  readDevicePushState: () => Promise<DevicePushState>;
  readPreferences: () => Promise<readonly NotificationPushPreferenceRow[]>;
  readPromptShown: () => Promise<boolean>;
};

/**
 * Whether to present the one-time push dialog after a sign-in on this device. The local reads
 * come first and settle most sign-ins without a request.
 */
export const shouldPresentSignInPushPrompt = async (
  reads: SignInPushPromptReads
): Promise<boolean> => {
  const [signInPushPromptShown, devicePushState] = await Promise.all([
    reads.readPromptShown(),
    reads.readDevicePushState(),
  ]);
  if (signInPushPromptShown || devicePushState !== 'can_request') {
    return false;
  }
  const [preferences, accountHasPushDevice] = await Promise.all([
    reads.readPreferences(),
    reads.readAccountHasPushDevice(),
  ]);
  return shouldOfferSignInPushPrompt({
    accountHasPushDevice,
    devicePushState,
    preferences,
    signInPushPromptShown,
  });
};
```

### `apps/mobile/src/notifications/SignInPushPromptHost.tsx` (new)

```tsx
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { useAuth } from '../auth/AuthProvider';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { notificationsRepository } from '../data/repositories';
import { resolveSupportedLocale } from '../i18n/locale';
import { accountHasAnyPushDevice } from '../lib/notifications/applyFirstSubscribePushChoice';
import { shouldPresentSignInPushPrompt } from '../lib/notifications/signInPushPrompt';
import { useAccessTier } from '../membership/useAccessTier';
import {
  hasShownSignInPushPrompt,
  markSignInPushPromptShown,
} from '../prefs/signInPushPromptPrefs';
import { readDevicePushState } from '../push/devicePushState.read';
import { enablePushOnThisDevice } from '../push/enablePushOnThisDevice';
import {
  isAccountConsentSettled,
  subscribeAccountConsentSettled,
} from '../terms/accountConsentSettled';

/**
 * Asks once, right after a person signs in on this device, whether to allow push here when the
 * account already has push on and a push device elsewhere. Opening the app already signed in
 * never asks.
 */
export function SignInPushPromptHost() {
  const { i18n, t } = useTranslation();
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const { evaluateFeature } = useAccessTier();
  const consentSettled = useSyncExternalStore(
    subscribeAccountConsentSettled,
    isAccountConsentSettled
  );
  const [visible, setVisible] = useState(false);
  const previousStatusRef = useRef(status);
  const pendingSignInRef = useRef(false);
  const sessionRef = useRef(0);
  const authRef = useRef<AuthRequestDeps>({ accessToken, clearSession, refreshToken, setTokens });
  authRef.current = { accessToken, clearSession, refreshToken, setTokens };

  const accountIdText = account?.id_text ?? null;
  const notificationsAllowed = evaluateFeature('notifications').allowed;

  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = status;
    if (status !== 'authenticated') {
      sessionRef.current += 1;
      pendingSignInRef.current = false;
      setVisible(false);
      return;
    }
    if (previous === 'anonymous') {
      pendingSignInRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (
      !pendingSignInRef.current ||
      status !== 'authenticated' ||
      accountIdText === null ||
      !consentSettled
    ) {
      return;
    }
    pendingSignInRef.current = false;
    if (!notificationsAllowed) {
      return;
    }

    const session = sessionRef.current;
    void shouldPresentSignInPushPrompt({
      readAccountHasPushDevice: () => accountHasAnyPushDevice(authRef.current),
      readDevicePushState,
      readPreferences: () => notificationsRepository.listPreferences(authRef.current),
      readPromptShown: () => hasShownSignInPushPrompt(accountIdText),
    })
      .then(async (present) => {
        if (!present || sessionRef.current !== session) {
          return;
        }
        setVisible(true);
        await markSignInPushPromptShown(accountIdText);
      })
      .catch((error: unknown) => {
        console.warn('Could not decide whether to offer push after sign-in', error);
      });
  }, [accountIdText, consentSettled, notificationsAllowed, status]);

  const handleEnable = useCallback(() => {
    setVisible(false);
    void enablePushOnThisDevice({
      auth: authRef.current,
      locale: resolveSupportedLocale(i18n.language),
    }).catch((error: unknown) => {
      console.warn('Could not enable push after the sign-in prompt', error);
    });
  }, [i18n.language]);

  const handleNotNow = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <ConfirmDialog
      body={t('settings.notifications.sign_in_push_prompt_body')}
      cancelLabel={t('settings.notifications.sign_in_push_prompt_not_now')}
      cancelTestID="sign-in-push-prompt-not-now"
      confirmLabel={t('settings.notifications.sign_in_push_prompt_enable')}
      confirmTestID="sign-in-push-prompt-enable"
      onCancel={handleNotNow}
      onConfirm={handleEnable}
      testID="sign-in-push-prompt-dialog"
      title={t('settings.notifications.sign_in_push_prompt_title')}
      visible={visible && status === 'authenticated'}
    />
  );
}
```

Why the refs:

- `authRef`: a token refresh during the check calls `setTokens`, which changes `accessToken`. Auth
  is read through a ref and kept out of the check effect's dependencies, so a refresh neither
  re-runs nor drops the check. The dialog's requests always use the current tokens.
- `sessionRef`: sign-out between the check starting and finishing bumps it, so a stale answer
  never presents for a signed-out (or different) session. The check effect has no cleanup on
  purpose; a cleanup would also run when `consentSettled` or `notificationsAllowed` re-render and
  would drop the only check this sign-in gets.
- The effects are declared in this order so the status effect sets the mark before the check effect
  reads it in the same commit.

Scrim tap and Android back call `onCancel` in `ConfirmDialog`, so they count as Not Now. The
enable result is not shown: on a denial the settings banner (plan 33) explains it, and on success
there is nothing to say.

### `apps/mobile/App.tsx`

1. Add `import { SignInPushPromptHost } from './src/notifications/SignInPushPromptHost';` directly
   after the `NotificationsRuntime` import.
2. In `AppBody`, add `<SignInPushPromptHost />` directly after `<CrossDevicePlaybackNotice />`
   inside `<TermsAcceptanceProvider>`. It needs `OverlayHostProvider`, `MembershipGateProvider`
   (for `useAccessTier`), and `AuthProvider`, all of which wrap that spot.

## Reuse

- `shouldOfferSignInPushPrompt`, `DevicePushState`, `NotificationPushPreferenceRow` (plan 10).
- `readDevicePushState`, `enablePushOnThisDevice`, `hasShownSignInPushPrompt`,
  `markSignInPushPromptShown`, and the exported `accountHasAnyPushDevice` (plan 30).
- `notificationsRepository.listPreferences`, `ConfirmDialog`, `useAccessTier`, and the
  `termsSyncGate.ts` store shape.
- Catalog keys `settings.notifications.sign_in_push_prompt_title`, `_body`, `_enable`, `_not_now`
  (plan 11). No new keys.

## Tests

`apps/mobile/src/lib/notifications/signInPushPrompt.test.ts` (vitest; plan 30's
`src/lib/notifications/*.test.ts` include picks it up). Build each read with `vi.fn`. Table-driven
where cases share a shape (**unit-test-design-no-overgranularity**):

- Not shown, `can_request`, a device on the account, and one row with `push_enabled: true`
  presents.
- Shown does not present, and neither `readPreferences` nor `readAccountHasPushDevice` is called.
- `enabled`, `blocked`, and `unsupported` do not present, with no network read called.
- No device on the account does not present; all rows `push_enabled: false` does not present.
- A rejecting `readPreferences` rejects (the host logs it).

No device flow. The E2E seed (`tools/web/seed-e2e.mjs`) creates no push device for the account,
and Maestro's `launchApp` grants notification permission by default, so the dialog never appears
in Maestro runs; the existing `auth-login` and `notifications-inbox` flows confirm signing in still
reaches Home.

## Release scratchpad

```markdown
## Mobile asks once to allow push after signing in on a new phone

- Surfaces: mobile
- Change: right after signing in on a phone that has not allowed notifications, a member whose
  account has Push on for at least one category and a push device elsewhere sees "Turn On Push
  Notifications on This Device?" once. Enable Push shows the system prompt and registers the
  phone; Not Now only records that it was asked. Category settings do not change. The dialog waits
  until the Terms and Taste Profile screens are done, never appears when the app opens already
  signed in, and is remembered per account on that phone, including after sign-out.
- Who notices: members signing in on a second phone or after reinstalling
- Operator steps: none
```
