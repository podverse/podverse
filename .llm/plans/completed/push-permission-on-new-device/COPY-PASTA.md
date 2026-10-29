# Push permission on a new device — COPY-PASTA

How to use:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above each fence).
1. Copy the fenced block only, paste, and the agent runs it.
1. Tick the box when that prompt is done.

Ledger and settled decisions: [00-SUMMARY.md](./00-SUMMARY.md) and the review answers D1–D20 in
[00-REQUEST.md](./00-REQUEST.md). Order and file ownership:
[00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run push-permission-on-new-device`. It runs one fresh agent per prompt on
that prompt's model, every pending prompt under the first pending heading at once, stops at the
first blocker, and resumes with
`./scripts/abcplan/run.sh run push-permission-on-new-device --resume 'Your answer.'`.

Phases run one after another. Prompts under one phase heading edit disjoint files and run at the
same time. Each of them puts its release-notes entry in its final message; Close appends them.

## Model per prompt

| Phase | Prompt | Cursor model | Reasoning | Why this tier |
| --- | --- | --- | --- | --- |
| 1 | 10 | Cursor Grok 4.7 | extra high | Pure decision functions every web and mobile prompt relies on; a fully specified plan |
| 1 | 11 | Cursor Grok 4.7 | medium | Targeted key insertions into eight large catalog files |
| 1 | 24 | Cursor Grok 4.7 | medium | One color variant on the shared `Banner`, two unit cases |
| 2 | 20 | Cursor Grok 4.7 | extra high | Web push state, storage flags, and E2E helpers three later prompts build on |
| 2 | 30 | Cursor Grok 4.7 | extra high | Mobile push state and one shared enable path three later prompts build on; refactors two existing callers |
| 3 | 21 | Cursor Grok 4.7 | high | Web sign-in dialog across a page reload, new spec |
| 3 | 22 | Cursor Grok 4.7 | medium | One component's toggle branch, new spec |
| 3 | 23 | Cursor Grok 4.7 | high | Banner and blocked guide on the settings tab, spec extension |
| 3 | 31 | Opus 5.5 | high | Sign-in detection and timing around the Terms and Taste Profile screens |
| 3 | 32 | Cursor Grok 4.7 | medium | One decision helper and its call in one hook |
| 3 | 33 | Cursor Grok 4.7 | high | Banner, blocked guide, and a Maestro segment with a device fixture |
| Close | Close | Cursor Grok 4.7 | medium | Append seven release entries, archive, cumulative verification |

Fast stays off. If a Cursor Grok 4.7 prompt stalls or makes the same mistake twice, rerun it one
reasoning level higher; from extra high, rerun it on **Codex 5.3 · high**. Escalate to
**Opus 5.5** only when the failure is a design question. Record the change on the prompt here.

## Phase 1

Three prompts at once. Owners: 10 owns `packages/helpers/src/lib/notificationPush.ts` and its test,
`packages/helpers/src/index.ts`, and `packages/helpers/package.json`. 11 owns the four consumer and
four mobile `originals/*.json` catalog files. 24 owns `packages/ui/src/components/layout/Banner/`
(`Banner.tsx`, `Banner.module.scss`, `Banner.test.tsx`). Nobody writes
`release-notes/scratchpad.md` in this phase.

- [x] **10 — Shared push prompt and banner decisions in @podverse/helpers**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/push-permission-on-new-device/10-helpers-push-prompt-decisions.md
Review answers D1–D5 in 00-REQUEST.md are settled. The banner decision takes three fields:
shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState, preferences }), true only when
the account has a push device, a category has Push on, and the state is can_request or blocked.
Export everything from the barrel and from the ./notificationPush subpath, as the plan says.
Prompts 11 and 24 run at the same time: edit only the files in this plan's ## Files, and report
errors in other files instead of fixing them. This plan has no release-notes entry.
Do not run tests.
When the plan is done, move 10-helpers-push-prompt-decisions.md to
.llm/plans/completed/push-permission-on-new-device/ and leave the rest of the set in active/.
End without a verification block: report what changed, any blocker, and anything a later prompt
needs.
```

- [x] **11 — Catalog copy for the sign-in push dialog, banner, and blocked guidance**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/push-permission-on-new-device/11-i18n-push-prompt-and-banner-copy.md
Add exactly the keys the plan lists, in every locale it lists, with targeted StrReplace insertions
beside the named anchor keys. Never rewrite a catalog file, and do not touch overrides/ or
compiled/.
Prompts 10 and 24 run at the same time: edit only the eight catalog files in this plan's ## Files,
and report errors elsewhere instead of fixing them. This plan has no release-notes entry.
Do not run tests.
When the plan is done, move 11-i18n-push-prompt-and-banner-copy.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed and any blocker.
```

- [x] **24 — Shared UI: a warning variant on Banner**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/push-permission-on-new-device/24-ui-banner-warning-variant.md
Review answer D8 is settled: extend the existing Banner with a warning variant. It changes colors
only, uses the existing theme tokens the plan names, adds no tokens, and carries no copy. danger
stays the default.
Prompts 10 and 11 run at the same time: edit only the three Banner files in this plan's ## Files,
and report errors elsewhere instead of fixing them. This plan has no release-notes entry.
Do not run tests.
When the plan is done, move 24-ui-banner-warning-variant.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed and any blocker.
```

## Phase 2

Start only after every Phase 1 prompt is done. Two prompts at once. Owners: 20 owns the nine
`apps/web` files in its `## Files` (push state, sign-in flags, `useWebDevicePushState`, the
Notifications context, `usePushChannelControls.ts`, `firstSubscribePushPrompt.ts`, and
`apps/web/e2e/helpers/webPushPermission.ts`). 30 owns the ten `apps/mobile` files in its
`## Files`, including `MoreSettingsNotificationsScreen.tsx` and `apps/mobile/vitest.config.ts`.
Nobody writes `release-notes/scratchpad.md` in this phase.

- [x] **20 — Web: this browser's push state, sign-in dialog flags, and shared E2E helpers**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/push-permission-on-new-device/20-web-device-push-state.md
No visible behavior changes in this plan. Review answer D6 is settled: an account with a Unified
Push device reads as enabled in every browser. Export the existing accountHasAnyPushDevice from
firstSubscribePushPrompt.ts in place; do not copy it.
Prompt 30 runs at the same time and edits only apps/mobile: edit only the files in this plan's
## Files, and report errors elsewhere instead of fixing them. This plan has no release-notes entry.
Do not run tests.
When the plan is done, move 20-web-device-push-state.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and the exact exports
prompts 21, 22, and 23 call.
```

- [x] **30 — Mobile: this device's push state, one enable path, and the sign-in dialog flag**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/push-permission-on-new-device/30-mobile-device-push-state-and-enable.md
Review answers D10, D11, D18, and D19 in 00-REQUEST.md are settled. Remove the lower permission
hint (more-settings-notification-permission-hint and more-settings-open-notification-settings)
and its state entirely. Android opens Podverse's own notification page through the linking tools
already in the app; do not add expo-application. The first-Subscribe prompt and the Push switches
otherwise behave exactly as today. Widen the vitest include to src/lib/notifications/*.test.ts so
prompts 31 and 32 never edit apps/mobile/vitest.config.ts.
Prompt 20 runs at the same time and edits only apps/web: edit only the files in this plan's
## Files, and report errors elsewhere instead of fixing them. Do not write
release-notes/scratchpad.md; put the plan's entry in your final message under "Release notes entry".
Do not run tests.
When the plan is done, move 30-mobile-device-push-state-and-enable.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and the exact exports
prompts 31, 32, and 33 call.
```

## Phase 3

Start only after every Phase 2 prompt is done. Six prompts at once. Owners: 21 owns
`ModalAuthLogin.tsx`, `Auth/SignInPushPrompt.tsx`, `App/AppChrome.tsx`, and
`apps/web/e2e/sign-in-push-prompt.spec.ts`. 22 owns `NotificationIconButton.tsx` and
`apps/web/e2e/channel-notification-bell-push-prompt.spec.ts`. 23 owns `DevicePushBanner.tsx`,
`SettingsNotifications.tsx`, and `apps/web/e2e/settings-notifications.spec.ts`. 31 owns
`apps/mobile/src/terms/accountConsentSettled.ts`, `TermsAcceptanceProvider.tsx`,
`apps/mobile/src/lib/notifications/signInPushPrompt.ts` and its test, `SignInPushPromptHost.tsx`,
and `apps/mobile/App.tsx`. 32 owns `channelBellPushPrompt.ts` and its test and
`useChannelNotifications.ts`. 33 owns `components/feedback/WarningBanner.tsx`,
`MoreSettingsNotificationsScreen.tsx`, `apps/mobile/e2e/notifications-inbox.yaml`, and
`apps/mobile/e2e/scripts/push-device-fixture.js`. Nobody writes `release-notes/scratchpad.md`.

- [x] **21 — Web: ask once after signing in when push is on for the account**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/push-permission-on-new-device/21-web-sign-in-push-dialog.md
Review answers D1, D3, D4, and D5 are settled. Ask only on the first page after ModalAuthLogin's
reload, never on a later load of a signed-in session. Write the shown flag when the dialog opens.
Neither answer changes category settings. Do not reuse or change the Subscribe dialog (D9).
Prompts 22, 23, 31, 32, and 33 run at the same time: edit only the files in this plan's ## Files,
and do not edit plan 20's files; report errors elsewhere instead of fixing them. Do not write
release-notes/scratchpad.md; put the plan's entry in your final message under "Release notes entry".
Do not run tests.
When the plan is done, move 21-web-sign-in-push-dialog.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and anything Close needs.
```

- [x] **22 — Web: the channel bell asks for push only until the sign-in dialog has been shown**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/push-permission-on-new-device/22-web-channel-bell-push-prompt.md
Review answer D7 is settled: turning a channel's notifications on always turns them on, whether
or not the bell asked and whatever the person answered at the browser prompt. Once the sign-in
dialog has been shown for this account in this browser, the bell never opens the browser prompt.
Prompts 21, 23, 31, 32, and 33 run at the same time: edit only the two files in this plan's
## Files, and report errors elsewhere instead of fixing them. Do not write
release-notes/scratchpad.md; put the plan's entry in your final message under "Release notes entry".
Do not run tests.
When the plan is done, move 22-web-channel-bell-push-prompt.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and anything Close needs.
```

- [x] **23 — Web: warning banner at the top of notification settings when this browser lacks push**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/push-permission-on-new-device/23-web-settings-device-push-banner.md
Review answers D2, D6, and D8 are settled. Use the shared Banner from @podverse/ui with
variant="warning" (plan 24); add no styles. Call
shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState, preferences }). The banner is
the first element of the Notifications tab, and its button asks the browser again or opens the
blocked guide.
Prompts 21, 22, 31, 32, and 33 run at the same time: edit only the files in this plan's ## Files,
and do not edit plan 20's or plan 24's files; report errors elsewhere instead of fixing them. Do
not write release-notes/scratchpad.md; put the plan's entry in your final message under
"Release notes entry".
Do not run tests.
When the plan is done, move 23-web-settings-device-push-banner.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and anything Close needs.
```

- [x] **31 — Mobile: ask once to allow push right after signing in on this device**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/push-permission-on-new-device/31-mobile-sign-in-push-dialog.md
Review answers D1, D3, D5, D12, D13, and D14 are settled. Detect sign-in by watching auth status
go from anonymous to authenticated; a cold start with a saved session never asks, and the sync
layer's sign-in trigger is not used. Wait until the Terms and Taste Profile screens are finished.
Run the check outside the sync queue; a failure only logs a warning. Write the shown flag only
when the dialog is presented. Neither answer changes category settings.
Prompts 21, 22, 23, 32, and 33 run at the same time: edit only the files in this plan's ## Files,
and do not edit plan 30's files or apps/mobile/vitest.config.ts; report errors elsewhere instead
of fixing them. Do not write release-notes/scratchpad.md; put the plan's entry in your final
message under "Release notes entry".
Do not run tests.
When the plan is done, move 31-mobile-sign-in-push-dialog.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and anything Close needs.
```

- [x] **32 — Mobile: turning on a channel's notifications asks for push until the sign-in dialog was shown**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/push-permission-on-new-device/32-mobile-channel-bell-push-prompt.md
Review answers D7, D15, and D16 are settled: the channel turns on whatever the person answers at
the system prompt, and the first-Subscribe prompt is unchanged. Read the shown flag from plan 30's
signInPushPromptPrefs, not from plan 31's files.
Prompts 21, 22, 23, 31, and 33 run at the same time: edit only the three files in this plan's
## Files, and do not edit apps/mobile/vitest.config.ts; report errors elsewhere instead of fixing
them. Do not write release-notes/scratchpad.md; put the plan's entry in your final message under
"Release notes entry".
Do not run tests.
When the plan is done, move 32-mobile-channel-bell-push-prompt.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and anything Close needs.
```

- [x] **33 — Mobile: warning banner at the top of notification settings when this phone lacks push**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/push-permission-on-new-device/33-mobile-settings-device-push-banner.md
Review answers D2, D17, D19, and D20 are settled. The banner is the first element in the screen's
cardStack, in warning colors, and shows only when
shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState, preferences }) is true. Once
the phone will not ask again, its button opens the Notifications Are Blocked guide, whose Open
System Settings button goes to Podverse's notification settings. Returning from system settings
with permission now allowed registers the phone. Do not bring back the lower permission hint plan
30 removed.
Prompts 21, 22, 23, 31, and 32 run at the same time: edit only the files in this plan's ## Files,
and do not edit plan 30's other files; report errors elsewhere instead of fixing them. Make
targeted insertions into notifications-inbox.yaml; do not rewrite it. Do not write
release-notes/scratchpad.md; put the plan's entry in your final message under "Release notes entry".
Do not run tests.
When the plan is done, move 33-mobile-settings-device-push-banner.md to
.llm/plans/completed/push-permission-on-new-device/.
End without a verification block: report what changed, any blocker, and anything Close needs.
```

## Close

Start only after every Phase 3 prompt is done.

- [x] **Close — release entries, archive the set, cumulative verification**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Close the plan set .llm/plans/active/push-permission-on-new-device/.
Read the "Release notes entry" section of
.artifacts/plan-runner/push-permission-on-new-device/30.md, 21.md, 22.md, 23.md, 31.md, 32.md, and
33.md, and append those seven entries to the end of release-notes/scratchpad.md in that order, one
blank line between entries. Do not edit any other entry. When a final message has no entry, use
the ## Release scratchpad block of that plan in
.llm/plans/completed/push-permission-on-new-device/. Plans 10, 11, 20, and 24 have no entry.
Confirm 10, 11, 20, 21, 22, 23, 24, 30, 31, 32, and 33 are in
.llm/plans/completed/push-permission-on-new-device/. Move 00-REQUEST.md, 00-SUMMARY.md,
00-EXECUTION-ORDER.md, and COPY-PASTA.md there, then remove the empty active directory. Change no
product code.
In your final message, list the open items from 00-EXECUTION-ORDER.md § Open after this set, and
any error a Phase 3 prompt reported in a file it did not own.
End with the cumulative verification for the whole set, assuming no earlier prompt was tested.
Two fenced bash blocks, fish-safe: the first labeled Root, the second labeled Mobile Maestro.
Tell the operator that Docker must be running for the web E2E report, that
NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY must be set in the E2E web env
(infra/config/local/web-sidecar.env), and that Mobile E2E Metro, Mobile E2E iOS, Mobile E2E
Android, and Mobile E2E API must already be up before the Mobile Maestro block. Do not put those
leave-running commands in either block. Note that there is no dependency change, so no lockfile
step; build:packages is needed first because mobile type-checks against the built
@podverse/helpers/notificationPush subpath.

Root:
npm run build:packages
npm run i18n:validate
npm run lint
npm run test -w packages/helpers
npm run test -w packages/ui
npm run type-check -w apps/web
npm run test -w apps/web
npm run type-check:mobile
npm --prefix apps/mobile run test
make e2e_test_web_report_spec SPEC=e2e/sign-in-push-prompt.spec.ts,e2e/channel-notification-bell-push-prompt.spec.ts,e2e/settings-notifications.spec.ts
open .artifacts/e2e-reports/latest/index.html

Mobile Maestro:
npm run mobile:e2e:test -- notifications-inbox,auth-login,push,settings-select,podcast-episode,album,artist
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
