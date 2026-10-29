# Push permission on a new device — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger and decisions: [00-SUMMARY.md](00-SUMMARY.md).
Prompts, models, and reasoning: [COPY-PASTA.md](COPY-PASTA.md).

Phases run one after another. Prompts inside one phase run at the same time and edit disjoint
files. The operator runs tests once, after Close. Review answers D1–D20 in 00-REQUEST.md are
settled for every prompt.

## Phase 1 — shared decisions, catalog copy, shared Banner variant (3 prompts at once)

| Prompt | Plan | Owns |
| --- | --- | --- |
| 10 | [10-helpers-push-prompt-decisions.md](10-helpers-push-prompt-decisions.md) | `packages/helpers/src/lib/notificationPush.ts`, `packages/helpers/src/lib/notificationPush.test.ts`, `packages/helpers/src/index.ts`, `packages/helpers/package.json` |
| 11 | [11-i18n-push-prompt-and-banner-copy.md](11-i18n-push-prompt-and-banner-copy.md) | `packages/i18n-catalog/consumer/originals/{en-US,es,fr,el-GR}.json`, `packages/i18n-catalog/mobile/originals/{en-US,es,fr,el-GR}.json` |
| 24 | [24-ui-banner-warning-variant.md](24-ui-banner-warning-variant.md) | `packages/ui/src/components/layout/Banner/Banner.tsx`, `Banner.module.scss`, `Banner.test.tsx` |

Why these share a phase:

- Each has `## Runs after: none`, and the three trees (helpers, i18n catalog, ui) do not overlap.
- 11 is the only prompt in the set that edits the catalogs; areas B and C add no keys.
- None of the three has a release-notes entry, so nobody writes `release-notes/scratchpad.md`.

## Phase 2 — per-surface device push state (2 prompts at once)

Start only after every Phase 1 prompt is done. Both read plan 10's `@podverse/helpers` exports and
plan 11's keys.

| Prompt | Plan | Owns |
| --- | --- | --- |
| 20 | [20-web-device-push-state.md](20-web-device-push-state.md) | `apps/web/src/lib/notifications/webDevicePushState.ts` and `.test.ts`, `apps/web/src/lib/notifications/signInPushPrompt.ts` and `.test.ts`, `apps/web/src/hooks/useWebDevicePushState.ts`, `apps/web/src/contexts/Notifications.tsx`, `apps/web/src/components/Settings/Panels/SettingsNotifications/usePushChannelControls.ts`, `apps/web/src/lib/notifications/firstSubscribePushPrompt.ts`, `apps/web/e2e/helpers/webPushPermission.ts` |
| 30 | [30-mobile-device-push-state-and-enable.md](30-mobile-device-push-state-and-enable.md) | `apps/mobile/src/push/devicePushState.ts`, `devicePushState.read.ts`, `devicePushState.test.ts`, `apps/mobile/src/push/enablePushOnThisDevice.ts`, `apps/mobile/src/push/fcmTransport.ts`, `apps/mobile/src/prefs/signInPushPromptPrefs.ts` and `.test.ts`, `apps/mobile/src/lib/notifications/applyFirstSubscribePushChoice.ts`, `apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx`, `apps/mobile/vitest.config.ts` |

- 20 is web-only and 30 is mobile-only.
- 30 widens the mobile vitest `include` to `src/lib/notifications/*.test.ts`, so plans 31 and 32
  add their tests without touching `apps/mobile/vitest.config.ts`.
- 30 puts its release-notes entry in its final message. 20 has none.

## Phase 3 — sign-in dialog, channel bell, settings banner on both surfaces (6 prompts at once)

Start only after every Phase 2 prompt is done.

| Prompt | Plan | Owns |
| --- | --- | --- |
| 21 | [21-web-sign-in-push-dialog.md](21-web-sign-in-push-dialog.md) | `apps/web/src/components/Modal/ModalAuthLogin.tsx`, `apps/web/src/components/Auth/SignInPushPrompt.tsx`, `apps/web/src/components/App/AppChrome.tsx`, `apps/web/e2e/sign-in-push-prompt.spec.ts` |
| 22 | [22-web-channel-bell-push-prompt.md](22-web-channel-bell-push-prompt.md) | `apps/web/src/components/Media/Header/NotificationIconButton.tsx`, `apps/web/e2e/channel-notification-bell-push-prompt.spec.ts` |
| 23 | [23-web-settings-device-push-banner.md](23-web-settings-device-push-banner.md) | `apps/web/src/components/Settings/Panels/SettingsNotifications/DevicePushBanner.tsx`, `SettingsNotifications.tsx`, `apps/web/e2e/settings-notifications.spec.ts` |
| 31 | [31-mobile-sign-in-push-dialog.md](31-mobile-sign-in-push-dialog.md) | `apps/mobile/src/terms/accountConsentSettled.ts`, `apps/mobile/src/terms/TermsAcceptanceProvider.tsx`, `apps/mobile/src/lib/notifications/signInPushPrompt.ts` and `.test.ts`, `apps/mobile/src/notifications/SignInPushPromptHost.tsx`, `apps/mobile/App.tsx` |
| 32 | [32-mobile-channel-bell-push-prompt.md](32-mobile-channel-bell-push-prompt.md) | `apps/mobile/src/lib/notifications/channelBellPushPrompt.ts` and `.test.ts`, `apps/mobile/src/hooks/useChannelNotifications.ts` |
| 33 | [33-mobile-settings-device-push-banner.md](33-mobile-settings-device-push-banner.md) | `apps/mobile/src/components/feedback/WarningBanner.tsx`, `apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx`, `apps/mobile/e2e/notifications-inbox.yaml`, `apps/mobile/e2e/scripts/push-device-fixture.js` |

Why these share a phase:

- No file appears in two rows. Each reads earlier phases' files without editing them:
  - 21 and 22 read plan 20's `apps/web/src/lib/notifications/signInPushPrompt.ts`.
  - 23 reads plan 20's `useWebDevicePushState` and `accountHasAnyPushDevice` export, and uses
    plan 24's `variant="warning"` on `Banner`.
  - 31, 32, and 33 read plan 30's `devicePushState`, `enablePushOnThisDevice`, and
    `signInPushPromptPrefs`. 33 also reads plan 30's `accountHasAnyPushDevice` export and
    `openSystemNotificationSettings`.
- 33 edits `MoreSettingsNotificationsScreen.tsx` after plan 30 removed the lower permission hint
  from it in Phase 2. No other Phase 3 prompt touches that screen.
- 33 is the only prompt that edits a Maestro flow. The new web specs need no line in
  `makefiles/local/e2e-spec-order-web.txt`, which only orders the full report and lists a subset
  of specs.
- All six put their release-notes entries in their final messages.

## Close (alone)

Start only after every Phase 3 prompt is done. Close appends the entries from
`.artifacts/plan-runner/push-permission-on-new-device/30.md`, `21.md`, `22.md`, `23.md`, `31.md`,
`32.md`, and `33.md` to `release-notes/scratchpad.md` in that order, archives the set to
`.llm/plans/completed/push-permission-on-new-device/`, and gives the cumulative verification.

## Open after this set

- **Untested Maestro assumption (plan 33).** The `notifications-inbox.yaml` segment assumes that
  Maestro's `launchApp` allows every permission by default and that `permissions: notifications:
  deny` works on the iOS simulator. If the default does not allow everything, the banner also
  appears earlier in that flow and can push the type-default rows below the fold.
- **No device flow for the mobile sign-in dialog (plan 31).** The E2E seed creates no push device,
  so the dialog is covered by vitest only. Plan 33's `push-device-fixture.js` could give it a
  device flow later.
- **Leftover placeholder device (plan 33).** If `notifications-inbox.yaml` fails between adding and
  removing the placeholder push device, the device stays until that flow's next run clears it.
  Meanwhile an In-App Only answer to the first-Subscribe prompt in another flow leaves media push
  on.
- **No route to system settings from a refused Push switch (plan 30, review D18).** On a phone
  whose account has no push device elsewhere, refusing the prompt from a Push switch leaves only
  the error line, because the lower hint is gone and the banner does not show.
- **Signed out of the only push device (review D1).** Mobile sign-out unregisters its device, so a
  person who signed out of their only push device is not asked on the next device.
- **Web E2E prerequisite.** The new web specs need `NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY` in the
  E2E web env (set in `infra/config/local/web-sidecar.env`). Without it they fail fast with a
  clear message.
