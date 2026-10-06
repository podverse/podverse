# Expo SDK 52 → 57 upgrade — summary

## Goal

Upgrade `apps/mobile` from Expo SDK 52 / React Native 0.76 / `expo-iap` 2.6.3
straight to Expo SDK 57 / React Native 0.86 / `expo-iap` 5.x so Google Play
accepts an internal-testing `.aab` (target API 36 + Play Billing Library ≥ 8).

Play currently blocks the version-code-3 draft with:

1. Billing Library 7.0.0 must be ≥ 8.0.0
2. Target API 34 must be ≥ 36

## Why a single jump (not staged 52 → 54 → 57)

- Android API 36 needs React Native 0.81+; SDK 54 is the first Expo that
  targets it. RN 0.81 / 0.83 / 0.86 all target 36 — stopping at 54 does not
  reduce the Android surface.
- `apps/mobile/ios` and `apps/mobile/android` are gitignored. Native projects
  are regenerated, not migrated SDK-by-SDK. Only four config plugins and two
  local modules carry committed native code.
- Expo CLI 57.0.27 already understands Xcode 27 Device Hub. Stopping at 54
  means carrying or re-porting the SDK 52 Xcode patch scripts for one more SDK.
- The app already sets `newArchEnabled: true`, so removing the legacy
  architecture in SDK 55 costs nothing.
- The app has never been published. There is no on-device data or OTA
  compatibility to stage around.

## Locked decisions

| Decision | Choice |
| -------- | ------ |
| Target SDK | Expo `57.0.x`, React Native 0.86, React 19.2 |
| Package pins | `npm --prefix apps/mobile exec -- expo install --fix` for every Expo package |
| Billing | `expo-iap` latest 5.x (openiap-google 3.6.x → Billing 8+). Keep the existing `BillingClient` interface |
| File system | Move all 7 `expo-file-system` imports to `expo-file-system/legacy`. New File/Directory API is out of scope |
| Background fetch | Keep `expo-background-fetch` (still in SDK 57). `expo-background-task` is a follow-up |
| iOS deployment target | Raise to `16.4` (SDK 57 template default) everywhere |
| Android edge-to-edge | Mandatory. Remove deprecated `androidStatusBar`; use `react-native-safe-area-context` 5.x |
| Native trees | Never commit. Finish every native step with `npm run mobile:reset` |
| Overrides | Keep `legacy-peer-deps=true` and `@xmldom/xmldom`. Drop `tar@6.2.1` unless prebuild fails with `reading 'extract'`. Drop explicit `expo-dev-launcher` / `expo-dev-menu` / `expo-dev-menu-interface` / `expo-updates-interface` deps and overrides unless `rg` finds an import |
| Agent-run verify (this set only) | **Exception** to the repo default “agents do not run tests.” Each numbered prompt runs its listed verify commands, fixes failures it owns, and only stops when a gate needs a human (Play Console UI, physical USB, or leave-running E2E tabs that were never started). |
| 02 then 03 | **Sequential** (not parallel) so Prompt 03 can run Checkpoint A against a complete tree |

## Out of scope

- Migrating `expo-file-system` callers to the new File/Directory API
- Migrating `expo-background-fetch` → `expo-background-task`
- Installing `expo-updates` / OTA
- PayPal `platform=foss` checkout gap
- Publishing to the live `com.podverse` listing
- Reusing the `com.podverse` upload keystore

## Inventory (what changes)

### Package / config (01)

- [`apps/mobile/package.json`](../../../../apps/mobile/package.json) — deps, overrides, `@types/react`
- [`apps/mobile/package-lock.json`](../../../../apps/mobile/package-lock.json) — regenerated
- [`apps/mobile/babel.config.js`](../../../../apps/mobile/babel.config.js) — drop `react-native-reanimated/plugin`
- [`apps/mobile/.npmrc`](../../../../apps/mobile/.npmrc) — keep `legacy-peer-deps=true`

### JS API migrations (02) — must not touch `src/billing/**` · before 03

- File system (7): `downloadManager.ts`, `PlaybackProvider.tsx`,
  `downloadStorageStats.ts`, `MoreOpmlScreen.tsx`, `useOpmlImport.ts`,
  `shareRemoteFile.ts`, `resolvePlaybackUrl.ts`
- Reanimated 4 (2): `FullPlayerScrubber.tsx`, `ReorderableSections.tsx`
- Notifications handler fields: `notificationRouting.ts`, `fcmTransport.ts`
  (and `autoDownloadBackgroundNotificationTask.ts` if it sets the same shape)
- React 19 types / `useRef` / `defaultProps` across type-check failures
- `react-native-safe-area-context` 5 and `@react-native-community/netinfo` 12
  call-site fixes as type-check surfaces them

### Billing / expo-iap 5 (03) — owns `src/billing/**` + Checkpoint A

After 02. Agent runs `type-check:mobile` + mobile unit tests.

- `playBillingClient.ts`, `storekitBillingClient.ts`
- `normalizeStorePurchase.ts`, `selectPlayOfferToken.ts`, `BillingClient.ts`
- `billingClient.test.ts`

### iOS native (04) — agent runs `mobile:ios` build gate

- `plugins/withPodverseCarPlay.js` — Obj-C → Swift AppDelegate port
- `plugins/withPodverseSplashScreen.js` — re-check storyboard repair
- `plugins/withPodverseIosPodBuildSettings.js` + `ios-pod-build-settings.rb`
- `app.config.ts` — ios deployment target only
- Both local podspecs under `modules/*/ios`
- Patch scripts under `scripts/mobile/` and their callers

### Android native (05) — agent runs `mobile:android` build gate

- `modules/podverse-media-engine/android/build.gradle`
- `modules/podverse-perf-probe/android/build.gradle`
- Media engine Kotlin sources
- `app.config.ts` — remove `androidStatusBar`
- Inset audit: `HeaderBar.tsx`, `FullPlayerScreen.tsx`, `MoreMenu.tsx`,
  `ManagedCopyModal.tsx`, `ModalSafeArea.tsx`, tab bar in `navigation/index.tsx`

### Device / Maestro (06)

- Agent starts/stops E2E API, test-assets, and Metro in background shells
- Installs E2E apps, runs Maestro, tears the stack down
- CarPlay / Android Auto / USB may defer to morning

### Guidance / docs (07)

- Agent runs the SDK-52 leftover `rg` gate
- `.cursor/skills/mobile-expo-monorepo/SKILL.md`
- `.cursor/rules/mobile-ios-simulator.mdc`, `vscode-terminals-commands.mdc`
- `apps/mobile/AGENTS.md`, `APPS-MOBILE.md`, `CARPLAY-ENTITLEMENT.md`
- `downloadStorage.ts` comment, NPM audit allowlist, verification issues,
  mobile release runbook

### EAS + Play (08)

- Agent runs `eas build` (beta/android, version code 4+)
- Operator: Play Console upload / rollout / subscriptions
- Archive this plan set after successful EAS build

## Primary risks

| Risk | Mitigation |
| ---- | ---------- |
| CarPlay plugin breaks on Swift `ExpoAppDelegate` | Dedicated 04 plan; keep regression guard (no CarPlay-only scene manifest); CarPlay checklist in 06 |
| `expo-iap` 5 API rewrite breaks purchase / restore | Keep `BillingClient` interface; Opus on 03; USB checkout in 06 |
| Local module gradle plugin / Media3 vs compileSdk 36 | Convert both modules in 05; bump Media3 only if compile fails |
| Edge-to-edge clips chrome / player | Inset audit in 05; Maestro + manual Android in 06 |
| Xcode 27 / Device Hub regressions after dropping patches | Retire only scripts fixed upstream; re-check fmt + sqlite vendoring |
| `tar@7` breaks prebuild | Drop override; restore `6.2.1` only if `reading 'extract'` returns |

## Follow-ups (not this set)

- `expo-file-system` → File/Directory API
- `expo-background-fetch` → `expo-background-task`
- EAS env vars for a real tester build (API base URL)
- Billing Library further bumps if Play raises the floor again

## Related session context

- EAS project: Expo org `podverse`, project `podverse-next`,
  `projectId` `b6f9f8a2-ea16-44b1-b725-2942c35b6f33`
- Prior successful (but Play-rejected) build: version code 3, version 5.5.3
- Package / bundle id stays `com.podverse.app.next` until convergence gate 4.25
