**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 22 — Web: the channel bell asks for push only until the sign-in dialog has been shown

The channel notification bell (`NotificationIconButton`) keeps its browser permission prompt for a
browser that has never seen the sign-in dialog. Once the sign-in dialog (plan 21) has been shown
for this account in this browser, turning a channel's notifications on never opens the browser
prompt; the person turns this browser on from notification settings (plan 23's banner, or the
existing Web Push and Push switches). Whether or not the bell asks, and whatever the person answers
at the browser prompt, turning a channel's notifications on always turns them on: the channel's
inbox notifications work without push. The mobile bell (plan 32) already behaves this way.

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

R10, R11, R12, R13, R14, R35

## Runs after

10, 20

## Files

apps/web/src/components/Media/Header/NotificationIconButton.tsx
apps/web/e2e/channel-notification-bell-push-prompt.spec.ts

## How the bell works today (answers R12)

In `NotificationIconButton.toggleNotification`, when a signed-in person turns a channel's
notifications on:

- If `Notification.permission` is not `granted`, it calls `requestNotificationPermission`, which
  opens the **browser's own** permission prompt directly. There is no in-app dialog first.
- If permission is still not `granted` afterwards, it returns without turning the channel's
  notifications on.
- It does not look at category Push settings, at the account's other devices, or at the Subscribe
  prompt's answered flag.

So on a browser whose permission is still `default`, the first press asks: yes, a person pressing
the bell for the first time on that browser is asked to allow push. It is per browser, not "first
time anywhere": every press asks again while permission stays `default`. Two gaps today: when
permission is `denied` the press silently does nothing, and on a browser without the Notification
API the press shows the generic "Error requesting notification permission" alert and does nothing.

## New behavior

The bell asks `shouldAutoPromptPushFromChannelBell` (plan 10) with this browser's
`DevicePushState` (plan 20) and the sign-in dialog's shown flag:

| Browser state | Sign-in dialog shown here? | Press "enable" does |
| --- | --- | --- |
| `can_request` | no | Browser prompt, as today. Then turns the channel's notifications on whatever the answer: allowed, refused, or dismissed. |
| `can_request` | yes | No prompt. Turns the channel's notifications on. |
| `enabled` | either | No prompt. Turns the channel's notifications on (same as today's granted path). |
| `blocked` | either | No prompt. Turns the channel's notifications on. |
| `unsupported` | either | No prompt. Turns the channel's notifications on. |

The channel notification row drives the inbox as well as push, so turning it on without push still
does something the person asked for, and the settings banner (plan 23) tells them this browser
lacks push. Refusing the browser prompt never turns notifications off for good: the browser now
reads `blocked`, and the banner's button explains how to allow them. Turning notifications off is
unchanged.

The one case that still stops without turning the channel on is a membership 403:
`requestNotificationPermission` rethrows a `membership.*` error from the web push device register,
and the existing `catch` opens the membership modal. Every other failure inside
`requestNotificationPermission` (service worker or subscription errors) is caught there, shows its
existing alert, and returns `false`; the bell then turns the channel on.

## Implementation

### `apps/web/src/components/Media/Header/NotificationIconButton.tsx`

1. Imports to add:

```typescript
import { shouldAutoPromptPushFromChannelBell } from '@podverse/helpers';

import { useNotifications } from '../../../contexts/Notifications';
import { useWebDevicePushState } from '../../../hooks/useWebDevicePushState';
import { hasShownSignInPushPrompt } from '../../../lib/notifications/signInPushPrompt';
```

   Keep `import type { DTOChannel } from '@podverse/helpers';` on its own line
   (**type-imports-separate-line**).

1. Next to the existing hook calls (after `useMembershipGate()`), add:

```typescript
  const { refreshWebPushRegistration } = useNotifications();
  const { devicePushState } = useWebDevicePushState();
```

   They go below the existing `if (kind === 'playlist') return null;`, like the hooks already
   there; `kind` never changes for a mounted button.

1. Replace the whole `else { ... }` branch of `toggleNotification` (the enable path, from the
   `// Read permission into a fresh variable` comment through `await setLoggedInAccount(updatedAccount);`)
   with:

```typescript
      } else {
        const autoPromptPush = shouldAutoPromptPushFromChannelBell({
          devicePushState,
          signInPushPromptShown: hasShownSignInPushPrompt(loggedInAccount.id_text),
        });
        if (autoPromptPush) {
          await requestNotificationPermission();
          await refreshWebPushRegistration();
        }

        const updatedAccount = await apiRequestService.reqAccountNotificationChannelCreate({
          channel_id_text: channel.id_text,
        });
        await setLoggedInAccount(updatedAccount);
      }
```

   The `try` / `catch` with `tryHandleMembershipGateError` around it stays as it is, so a
   membership 403 from the device register or the channel create still opens the membership modal.
   Nothing reads `Notification.permission` after the prompt; the answer does not change whether the
   channel is turned on.

`requestNotificationPermission` now also runs when permission is already `granted` but this
browser is not registered (`can_request`); it resolves the prompt at once and registers this
browser, which is the point of asking. Do not edit `requestNotificationPermission.ts`.

Do not change `SubscribeButton.tsx` or `firstSubscribePushPrompt.ts`'s Subscribe flow. The
Subscribe dialog keeps its own answered flag and is not affected by the sign-in dialog's flag.

## Tests

New `apps/web/e2e/channel-notification-bell-push-prompt.spec.ts`, following **e2e-readability**
and **e2e-screenshot-verified-element**. Use the helpers from `./helpers/webPushPermission`
(plan 20), `capturePageLoad` / `actionAndCapture` from `./helpers/stepScreenshots`, and
`E2E_PODCAST_CHANNEL_ID_TEXT` from `./helpers/seedConstants`.

Shared setup in each test:

- Log in through the API like `settings-notifications.spec.ts` does (`loginSeedUser`: POST
  `http://localhost:4030/api/v2/auth/login` with `e2e-user@example.com` / `Test!1Aa` via
  `page.request`). Signing in this way never sets the pending flag, so plan 21's dialog stays out
  of the way.
- `stubBrowserNotificationPermission(page, { permission: 'default', requestResult: 'denied' })`.
- `mockAccountPushDevices(page, { otherBrowserWebPushDevices: 0, unifiedPushDevice: false })`.
- Open `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}` and call `expectWebPushConfigured(page)`.
- The bell is `page.getByRole('button', { name: 'Enable Notifications for This Podcast' })`.
- Collect channel-create requests:
  `page.on('request', …)` pushing requests whose method is `POST` and URL ends with
  `/api/v2/account/notification/channel`.
- In a `finally`, turn the channel off through the API so reruns start clean:
  `await page.request.delete(`http://localhost:4030/api/v2/account/notification/channel/${E2E_PODCAST_CHANNEL_ID_TEXT}`)`,
  ignoring the status.

1. **"Before the sign-in dialog has been shown in this browser, turning a podcast's notifications on
   asks the browser for permission, and declining still turns the podcast's notifications on."**
   Start `const channelCreate = page.waitForRequest(…)` for the channel-create request (method
   `POST`, URL ends with `/api/v2/account/notification/channel`) before clicking the bell, then
   click it. `readRequestPermissionCalls(page)` becomes 1 (`expect.poll`), and `await channelCreate`
   resolves: the channel-create request is sent after the stubbed prompt returned `denied`. Capture
   the bell.
1. **"After the sign-in dialog has been shown in this browser, turning a podcast's notifications on
   does not ask the browser and turns them on."**
   Before the `goto`, read the account id with
   `page.request.get('http://localhost:4030/api/v2/auth/me')` (`id_text` in the JSON body) and add
   `page.addInitScript` that sets `localStorage['notifications.sign_in_push_prompt_shown:<id_text>'] = '1'`.
   Click the bell. A channel-create request is sent (`page.waitForRequest`), and
   `readRequestPermissionCalls(page)` is 0. Capture the bell.
1. **"When this browser has blocked notifications, turning a podcast's notifications on does not
   ask and turns them on."**
   Stub `{ permission: 'denied', requestResult: 'denied' }` instead, no shown flag. Click the bell:
   a channel-create request is sent and `readRequestPermissionCalls(page)` is 0.

Assert on the request being sent, not on the bell's label afterwards, so the test does not depend
on the seeded user's membership.

## Release scratchpad

```markdown
## Web channel bell always turns notifications on and stops re-asking for push after the sign-in prompt

- Surfaces: web
- Change: turning on a podcast, album, or artist's notifications asks the browser for push
  permission only while this browser has never shown the sign-in push dialog for the account.
  After that dialog has been shown, and on browsers that blocked notifications or cannot receive
  push, the bell turns the channel's notifications on without asking; push for this browser is
  turned on from notification settings. When the bell does ask and the person refuses or dismisses
  the browser prompt, the channel's notifications still turn on, so its inbox notifications arrive
  without push (the mobile app already worked this way). Before, refusing the prompt left the
  channel off, a blocked browser's bell did nothing, and an unsupported browser showed an error.
- Who notices: people who refuse the browser's notification prompt, dismissed the sign-in push
  dialog, or blocked notifications in their browser, and then turn on a channel's notifications
- Operator steps: none
```
