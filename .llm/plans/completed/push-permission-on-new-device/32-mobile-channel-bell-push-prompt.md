**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 32 — Mobile: turning on a channel's notifications asks for push until the sign-in dialog was shown

Turning on a podcast, album, or artist's notifications (the header bell, or the switch in that
channel's settings pane) shows the system push prompt first when this phone can still ask and the
sign-in dialog (plan 31) has never been shown here for this account. Once that dialog has been
shown, turning a channel on never prompts; the person allows this phone from notification settings
(plan 33's banner). The first-Subscribe prompt is unchanged.

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

R23, R24, R25, R26

## Runs after

10, 11, 30

## Files

apps/mobile/src/lib/notifications/channelBellPushPrompt.ts
apps/mobile/src/lib/notifications/channelBellPushPrompt.test.ts
apps/mobile/src/hooks/useChannelNotifications.ts

## How it works today (answers R25)

No: on mobile, pressing a channel's notification bell never asks for push today.

- `useChannelNotifications.setEnabled` (used by the header bell through `toggleEnabled`, and by
  `PodcastSettingsScreen` and `ChannelSettingsPane` directly) checks sign-in and the Membership
  gate, then creates or deletes the channel's notification row with
  `syncChannelNotificationEnabled`. It never reads or requests the system permission.
- Two places ask today. The first time an account taps Subscribe on a phone,
  `useFirstSubscribePushPrompt` asks Enable Push or In-App Only, once per account per phone
  (`subscribePushPromptPrefs.ts`); Enable Push runs the system prompt. And turning a category's Push
  switch on in More › Settings › Notifications runs the system prompt.
- Web differs: its bell (`NotificationIconButton`) shows the browser prompt on every press while
  permission is undecided (plan 22).
- `notificationsBellPress.ts` is the Home inbox bell, not a channel bell, and has nothing to change.

## New behavior

When `setEnabled(true)` runs for a signed-in member whose account snapshot is loaded:

| This phone | Sign-in dialog shown here for this account? | Turning notifications on does |
| --- | --- | --- |
| `can_request` | no | System prompt first (through `enablePushOnThisDevice`), then creates the row whatever the answer. |
| `can_request` | yes | No prompt. Creates the row. |
| `enabled`, `blocked`, `unsupported` | either | No prompt. Creates the row. |

- The row is created whatever the system answer, as it is today on mobile. The row drives the inbox
  as well as push, so it still does what the person asked, and plan 33's banner explains the
  missing push. Web stops without turning the channel on after a refusal because that is web's
  existing behavior; each surface keeps its own.
- No in-app dialog comes before the system prompt: the press is the person asking for
  notifications, and the system prompt names the app.
- The prompt runs inside `runWrite`'s write, so the bell shows its saving state until the person
  answers and a second press while the prompt is up is ignored. Turning notifications off and
  `setTypeEnabled` are unchanged.
- A failure while reading state or asking logs a warning and the row is still created.
- While the account snapshot is still loading (`account === null`), there is no account id to key
  the flag, so no prompt; the row is created as today.

The first-Subscribe prompt is untouched (R24). Subscribe enables channel alerts through
`applyFirstSubscribePushChoice`, not through this hook, so the two never prompt together. It keeps
asking once per account per phone even after the sign-in dialog was shown here; it answers a
different question (whether Subscribe should turn on media push) and can set category settings.

## Implementation

### `apps/mobile/src/lib/notifications/channelBellPushPrompt.ts` (new)

Reads are injected so vitest runs this in node. Do not import from `src/push`, `src/prefs`, or
`src/auth` here.

```typescript
import type { DevicePushState } from '@podverse/helpers/notificationPush';
import { shouldAutoPromptPushFromChannelBell } from '@podverse/helpers/notificationPush';

export type ChannelBellPushPromptDeps = {
  enablePush: () => Promise<unknown>;
  readDevicePushState: () => Promise<DevicePushState>;
  readPromptShown: () => Promise<boolean>;
};

/**
 * Before a channel's notifications turn on, shows the system push prompt while this device can
 * still ask and the sign-in push dialog has not been shown here. Returns whether it asked.
 */
export const promptPushFromChannelBellIfAllowed = async (
  deps: ChannelBellPushPromptDeps
): Promise<boolean> => {
  const [devicePushState, signInPushPromptShown] = await Promise.all([
    deps.readDevicePushState(),
    deps.readPromptShown(),
  ]);
  if (!shouldAutoPromptPushFromChannelBell({ devicePushState, signInPushPromptShown })) {
    return false;
  }
  await deps.enablePush();
  return true;
};
```

### `apps/mobile/src/hooks/useChannelNotifications.ts`

1. Imports to add, in the existing groups:

```typescript
import { useTranslation } from 'react-i18next';

import { resolveSupportedLocale } from '../i18n/locale';
import { promptPushFromChannelBellIfAllowed } from '../lib/notifications/channelBellPushPrompt';
import { hasShownSignInPushPrompt } from '../prefs/signInPushPromptPrefs';
import { readDevicePushState } from '../push/devicePushState.read';
import { enablePushOnThisDevice } from '../push/enablePushOnThisDevice';
```

2. After `const { evaluateFeature } = useAccessTier();` add:

```typescript
  const { i18n } = useTranslation();
```

   and after `const isSignedIn = status === 'authenticated';` add:

```typescript
  const accountIdText = account?.id_text ?? null;
```

3. Replace `setEnabled` with:

```typescript
  const setEnabled = useCallback(
    async (next: boolean): Promise<void> => {
      await runWrite(async () => {
        const auth = { accessToken, clearSession, refreshToken, setTokens };
        if (next && accountIdText !== null) {
          try {
            await promptPushFromChannelBellIfAllowed({
              enablePush: () =>
                enablePushOnThisDevice({ auth, locale: resolveSupportedLocale(i18n.language) }),
              readDevicePushState,
              readPromptShown: () => hasShownSignInPushPrompt(accountIdText),
            });
          } catch (error) {
            console.warn('Could not ask for push before turning on channel notifications', error);
          }
        }
        await syncChannelNotificationEnabled({
          auth,
          channelIdText,
          enabled: next,
          setAccount,
        });
      });
    },
    [
      accessToken,
      accountIdText,
      channelIdText,
      clearSession,
      i18n.language,
      refreshToken,
      runWrite,
      setAccount,
      setTokens,
    ]
  );
```

4. In the hook's doc comment, after the paragraph that starts "Denials are answered twice", add:

```typescript
 * Turning a channel on first shows the system push prompt while this device can still ask and the
 * sign-in push dialog has not been shown here for this account. The row is created whatever the
 * answer.
```

## Reuse

- `shouldAutoPromptPushFromChannelBell` and `DevicePushState` (plan 10).
- `readDevicePushState`, `enablePushOnThisDevice`, `hasShownSignInPushPrompt` (plan 30).
- `runWrite`'s existing sign-in and Membership gate; no new gate.
- No catalog keys.

## Tests

`apps/mobile/src/lib/notifications/channelBellPushPrompt.test.ts` (vitest; plan 30's
`src/lib/notifications/*.test.ts` include picks it up). `vi.fn` deps, one `it.each` table:

- `can_request` and not shown calls `enablePush` once and returns true.
- `can_request` and shown does not call `enablePush` and returns false.
- `enabled`, `blocked`, and `unsupported`, not shown, do not call `enablePush` and return false.

No new device flow. Maestro grants notification permission at launch, so this phone reads
`enabled` and the existing `album`, `artist`, and `podcast-episode` bell steps run unchanged; they
confirm the bell still turns channels on.

## Release scratchpad

```markdown
## Mobile channel bell asks for push on a phone that has never been asked

- Surfaces: mobile
- Change: turning on a podcast, album, or artist's notifications (header bell or the channel's
  settings switch) now shows the system notification prompt first when the phone has not decided
  yet and the post-sign-in push dialog has never been shown there for this account. The channel's
  notifications turn on whatever the answer. Once the post-sign-in dialog has been shown on that
  phone, the bell never prompts; push is turned on from Notification settings. The first-Subscribe
  push prompt is unchanged.
- Who notices: members who turn on a show's notifications on a phone that never allowed push
- Operator steps: none
```
