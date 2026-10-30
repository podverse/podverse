# Push permission on a new device — summary

Request: [00-REQUEST.md](00-REQUEST.md). Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Order and
file ownership: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Requirement ledger

Rows quote the request. Rows marked "(Operator answers)" quote the operator's answers in
00-REQUEST.md where the answer adds an ask the request text does not state. Rows that apply to both
web and mobile appear once per surface, so each surface's plan owns its own row.

### Area A — shared decision and copy

- **R1** (area A) "the user has in their settings saved to the database that they should have push notifications enabled for at least one item" — Plan: 10
- **R2** (area A) "we don't want to ask them for that permission unless they already have notifications saved" — Plan: 10
- **R3** (area A) "If the user has no push notification settings enabled, they should not see this banner." — Plan: 10
- **R4** (area A) "It is only to be displayed when the user has them enabled, but hasn't granted this device permission for them." — Plan: 10
- **R5** (area A) "That they have push notifications but have not given permission to receive push notifications on this device." (banner copy) — Plan: 11
- **R6** (area A) (Operator answers) "A short in-app dialog: enable push on this device, or not now." (dialog copy) — Plan: 11
- **R33** (area A, step 05) (Review D2) "Same rule as the dialog: a registered push device somewhere, a category with Push on, and this device has not allowed notifications. New accounts that only have the seeded defaults do not see it." (banner rule) — Plan: 10

### Area B — web

- **R7** (area B) "When a user signs into a device and that user has never been presented with the option to enable push notifications yet, but the user has in their settings saved to the database that they should have push notifications enabled for at least one item, then the browser [...] should automatically ask them once if they want to enable push notifications." — Plan: 21
- **R8** (area B) (Operator answers) "Yes asks the system for permission and registers this device. No only records that we asked. Settings stay unchanged." — Plan: 21
- **R9** (area B) (Operator answers) "Only right after they sign in on this device." — Plan: 21
- **R10** (area B) "Otherwise, the notification enable feature should happen the first time they try to add notifications on that device." — Plan: 22
- **R11** (area B) "I think we want to preserve our existing pop-up request for notifications process" — Plan: 22
- **R12** (area B) "double check that the way we have notifications set up now is that if a user for the very first time anywhere presses the notification button on a device and they don't have push notifications enabled, that it will ask them if they want to enable push notifications" (question row) — Plan: 22
- **R13** (area B) "if they already received that notification due to the scenario I have described [...] then that action shouldn't display the automatic enable push notifications pop up" — Plan: 22
- **R14** (area B) "Instead, the user is expected to go into their notification settings and manually enable push notifications in there." — Plan: 22, 23
- **R15** (area B) "there should be a warning banner at the top of the notification settings screen if a user has push notifications enabled but does not have push notifications enabled for that device" — Plan: 23
- **R16** (area B) "And there should be a button in that warning banner." (Operator answers: "I would like for it to prompt the user again with the native dialogue") — Plan: 23
- **R17** (area B) "It should be warning colors instead of danger" — Plan: 23, 24
- **R18** (area B) "it should be at the very top of the notification screen" — Plan: 23
- **R19** (area B) (Operator answers) "the fallback behavior would be to pop up information that guides them to easily enable the settings themselves. If there is a link that we can show them or a button that can take them directly to the notification settings for Podverse, then we want to do that." — Plan: 23
- **R34** (area B, step 06) (Review D2) "Same rule as the dialog: a registered push device somewhere, a category with Push on, and this device has not allowed notifications." (web banner) — Plan: 23
- **R35** (area B, step 06) (Review D7) "When someone turns notifications on and they refuse the push notification, whether that be web or mobile, we still want the notification to turn on because they will begin getting inbox notifications" (web channel bell) — Plan: 22
- **R36** (area B, step 06) (Review D8) "Even if this is only the first time we're using a banner of this style, let's make it a component that could potentially be used elsewhere on the site." (warning variant on the shared `@podverse/ui` `Banner`) — Plan: 24

### Area C — mobile

- **R20** (area C) "When a user signs into a device and that user has never been presented with the option to enable push notifications yet, but the user has in their settings saved to the database that they should have push notifications enabled for at least one item, then the [...] mobile app should automatically ask them once if they want to enable push notifications." — Plan: 31
- **R21** (area C) (Operator answers) "Yes asks the system for permission and registers this device. No only records that we asked. Settings stay unchanged." — Plan: 31
- **R22** (area C) (Operator answers) "Only right after they sign in on this device." — Plan: 31
- **R23** (area C) "Otherwise, the notification enable feature should happen the first time they try to add notifications on that device." — Plan: 32
- **R24** (area C) "I think we want to preserve our existing pop-up request for notifications process" — Plan: 32
- **R25** (area C) "double check that the way we have notifications set up now is that if a user for the very first time anywhere presses the notification button on a device and they don't have push notifications enabled, that it will ask them if they want to enable push notifications" (question row) — Plan: 32
- **R26** (area C) "if they already received that notification due to the scenario I have described [...] then that action shouldn't display the automatic enable push notifications pop up" — Plan: 32
- **R27** (area C) "Instead, the user is expected to go into their notification settings and manually enable push notifications in there." — Plan: 33
- **R28** (area C) "there should be a warning banner at the top of the notification settings screen if a user has push notifications enabled but does not have push notifications enabled for that device" — Plan: 33
- **R29** (area C) "And there should be a button in that warning banner." (Operator answers: "I would like for it to prompt the user again with the native dialogue, but if that is forbidden by mobile devices, then do whatever the best practice is.") — Plan: 33
- **R30** (area C) "It should be warning colors instead of danger" — Plan: 33
- **R31** (area C) "it should be at the very top of the notification screen" — Plan: 33
- **R32** (area C) (Operator answers) "the fallback behavior would be to pop up information that guides them to easily enable the settings themselves. If there is a link that we can show them or a button that can take them directly to the notification settings for Podverse, then we want to do that." — Plan: 33
- **R37** (area C, step 07) (Review D2) "Same rule as the dialog: a registered push device somewhere, a category with Push on, and this device has not allowed notifications." (mobile banner) — Plan: 33
- **R38** (area C, step 07) (Review D18) "I think we can get rid of the lower hint on mobile and web since the warning banner should be sufficient for that purpose." (remove `more-settings-notification-permission-hint` and its Open System Settings link entirely) — Plan: 30

## Areas

### Area A — shared decision and copy

- **Rows:** R1–R6
- **Plan number block:** 10–19
- **Depends on:** no other area
- **Starts from:** `packages/helpers/src/lib/notificationCategory.ts` (category enum and
  `DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES`, where `new-content` and `livestream` default to push
  on), `packages/helpers/src/dtos/account/accountNotificationPreference.ts`,
  `packages/orm/src/services/account/accountNotificationPreference.ts` and
  `apps/api/src/lib/accountNotificationApiSerialization.ts` (to learn whether the preferences
  GET returns saved rows only or rows merged with defaults), and the Subscribe prompt keys
  `first_subscribe_enable_push` / `first_subscribe_in_app_only` in
  `packages/i18n-catalog/consumer/originals/en-US.json`.
- **Owns:** the pure functions both surfaces call, in `@podverse/helpers`: whether at least one
  category has push turned on, whether the sign-in dialog should be offered (push on, permission
  not granted, not yet shown for this account on this device), whether the settings banner shows,
  and the shared per-account storage key shape for "dialog shown" (storage itself stays per
  surface: web localStorage, mobile AsyncStorage). It also owns **every new i18n key** for the
  set: dialog title, body, and both buttons; banner text and button; and the fallback guidance
  and "open settings" copy for web and mobile. Areas B and C add no catalog keys.
- **Shares with other areas:** B and C import A's helpers and keys. No file is edited by more
  than one area.

### Area B — web

- **Rows:** R7–R19
- **Plan number block:** 20–29
- **Depends on:** area A (plans 10–19)
- **Starts from:** `apps/web/src/components/Modal/ModalAuthLogin.tsx` (password sign-in calls
  `reqAuthLogin`; find every other web sign-in path), `apps/web/src/components/Media/Header/NotificationIconButton.tsx`
  (channel bell; calls `requestNotificationPermission` when not granted),
  `apps/web/src/lib/notifications/firstSubscribePushPrompt.ts` and
  `apps/web/src/components/Media/Header/SubscribeButton.tsx` (the Subscribe prompt that stays
  as it is), `apps/web/src/lib/notifications/webpush/requestNotificationPermission.ts`,
  `apps/web/src/components/Settings/Panels/SettingsNotifications/SettingsNotifications.tsx` and
  `usePushChannelControls.ts` (settings screen and its push controls), and the web E2E specs
  that cover sign-in, the channel bell, and notification settings.
- **Shares with other areas:** imports from A only. Edits stay under `apps/web/`, except plan 24,
  which adds a `warning` variant to the shared `Banner` in
  `packages/ui/src/components/layout/Banner/` (R36).

### Area C — mobile

- **Rows:** R20–R32
- **Plan number block:** 30–39
- **Depends on:** area A (plans 10–19)
- **Starts from:** `apps/mobile/src/auth/AuthProvider.tsx`, `completeMobilePasswordLogin.ts`,
  `loginWithMobileToken.ts` (sign-in paths), `apps/mobile/src/auth/syncAccountPrefs.ts`
  (`registerPushDeviceForAccount`), `apps/mobile/src/hooks/useChannelNotifications.ts` and
  `apps/mobile/src/lib/notifications/notificationsBellPress.ts` (channel bell),
  `apps/mobile/src/push/fcmTransport.ts` and `unifiedPushTransport.ts` (system permission per
  flavor), `apps/mobile/src/hooks/useFirstSubscribePushPrompt.tsx` and
  `apps/mobile/src/prefs/subscribePushPromptPrefs.ts` (the Subscribe prompt that stays as it is),
  `apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx` (existing lower permission
  hint and `openSystemNotificationSettings`), and the Maestro flows under `apps/mobile/e2e/`.
- **Shares with other areas:** imports from A only. Edits stay under `apps/mobile/`.

## Order

- **Wave 1:** area A (step 02). B and C call its helpers and render its copy, so they plan
  against its contract.
- **Wave 2:** areas B and C (steps 03 and 04), in parallel. They edit disjoint trees.
- **Second pass after the first review** (steps 05, 06, 07, in parallel; rows R33–R38). The
  operator's answers are in 00-REQUEST.md under "Review of the first planning pass". D1, D3–D6,
  D9–D17, D19 and D20 confirm what the plans already say. The answers that change plans:
  - D2 adds the device requirement to the banner rule: step 05 revises plan 10, and steps 06 and
    07 pass `accountHasPushDevice` from plans 23 and 33.
  - D7 has the web bell turn the channel on after a refusal: step 06 revises plan 22.
  - D8 adds a shared `Banner` warning variant: step 06 writes plan 24 and revises plan 23 to use it.
  - D18 removes the mobile lower permission hint entirely: step 07 revises plans 30 and 33.

Implementation-time shared file: `release-notes/scratchpad.md` (every area's plans add an entry;
Close places them per § Assemble).

## Decisions to review

Product choices the request and answers did not settle, collected from the area steps' final
messages. Each item names its step and plan, the choice made, and the main alternative. All are
settled by the operator in 00-REQUEST.md under "Review of the first planning pass"; where that
section differs from an item below, the review answer wins.

### Area A — shared decision and copy (step 02)

- **D1** (step 02, plan 10) The sign-in dialog also requires the account to have a registered push device somewhere (FCM, web push, or Unified Push), on top of at least one category with Push on. Reason: account creation seeds `new-content` and `livestream` with Push on, so without this every new account gets the dialog on first sign-in. Gap: mobile sign-out unregisters its device, so someone who signed out of their only push device is not asked on the next device. Alternatives: count category push alone (everyone is asked), or add a server-side "push turned on" marker (closes the gap; needs API, DTO, and migration work).
- **D2** (step 02, plan 10) The settings banner uses category push alone, with no device requirement. A new account with the seeded defaults sees it on notification settings until it allows a device or turns push off. Alternative: the same device requirement as the dialog.
- **D3** (step 02, plan 10) A device whose permission is already blocked skips the dialog and is not recorded as shown; the banner and its guidance cover it. Alternative: show the dialog anyway and have Yes open the guidance.
- **D4** (step 02, plan 10) A browser or build that cannot receive push gets neither the dialog nor the banner. Alternative: a banner saying this device cannot receive push.
- **D5** (step 02, plan 10) The "dialog shown" flag is per account and survives sign-out, like the Subscribe prompt's answered flag. Alternative: clear it on sign-out.

### Area B — web (step 03)

- **D6** (step 03, plan 20) An account with a Unified Push device counts as push enabled in every browser, matching how web settings treat Web Push and Unified Push as alternatives; it also keeps the banner button from running the existing step that deletes the account's Unified Push device. Catch: a Unified Push user gets no dialog or banner on web. Alternative: count only this browser's Web Push, which means reworking that deletion step.
- **D7** (step 03, plan 22) When the bell does not prompt (after the sign-in dialog was shown, on a blocked browser, or on a browser that cannot receive push), it still turns the channel's notifications on. Today a blocked browser's bell does nothing and an unsupported browser shows an error alert. When the bell does prompt and the person refuses, it stops without turning the channel on, as today. Alternative: keep requiring granted permission before the bell does anything.
- **D8** (step 03, plan 23) The web banner is built inside `apps/web` with the theme's warning colors, because the shared `@podverse/ui` `Banner` only has a danger variant. Alternative: add a `warning` variant to the shared `Banner`.
- **D9** (step 03, plans 21 and 22) The Subscribe dialog ignores the new "shown" flag and keeps its own answered flag. Alternative: showing the sign-in dialog also marks the Subscribe dialog as answered.

### Area C — mobile (step 04)

- **D10** (step 04, plan 30) On an FCM build, granted permission counts as enabled even before registration finishes, because the sign-in and app-start sync job registers without asking. Alternative: `can_request` until registration finishes.
- **D11** (step 04, plan 30) An unregistered Unified Push build counts as unsupported, since no system prompt can change it and More › Advanced already covers setup. Alternative: `can_request` with a retry.
- **D12** (step 04, plan 31) Sign-in is detected by watching auth status change from signed out to signed in; the sync layer's sign-in trigger also fires on cold starts. Alternative: set a flag in `completeMobilePasswordLogin`.
- **D13** (step 04, plan 31) The dialog waits until the Terms and Taste Profile screens are finished, because it would otherwise open hidden beneath them. Alternative: show it as soon as the account loads.
- **D14** (step 04, plan 31) The sign-in check runs at the end of sign-in, outside the sync queue; a failure only logs a warning. Alternative: a new sync job.
- **D15** (step 04, plan 32) The mobile bell opens the system prompt directly, then turns the channel on whatever the answer, keeping today's mobile behavior. This differs from web (D7), which leaves the channel off when the person refuses. Alternative: an in-app question first, which needs new copy; or match web and stop on refusal.
- **D16** (step 04, plan 32) The first-Subscribe prompt stays as it is, even after the sign-in dialog has been shown (same choice as D9 on web). Alternative: suppress it.
- **D17** (step 04, plan 33) No guide right after a refusal: the banner stays up and the next tap opens the guide. Alternative: open the guide immediately.
- **D18** (step 04, plan 33) The existing lower "permission required" hint and its link hide while the banner shows. Alternative: keep both.
- **D19** (step 04, plan 30) The Android "Open System Settings" link opens Podverse's own notification page with `Linking.sendIntent` and the package name from `expo-constants`, so no new dependency or native rebuild. iOS keeps `Linking.openSettings()`. Alternative: add `expo-application`.
- **D20** (step 04, plan 33) When notifications go from blocked to allowed while the person is in system settings, returning to the screen registers the phone right away. Alternative: wait for the next app start.
