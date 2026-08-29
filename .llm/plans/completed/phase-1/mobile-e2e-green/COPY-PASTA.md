# COPY-PASTA — mobile-e2e-green

Run prompts in order. Tick each when complete. Keep the leave-running stack up the whole
time. Agents: implement + fix only; the operator runs the flows.

## Leave-running (named tabs — start once, keep up)

**Mobile Metro**

```bash
npm run mobile:dev:e2e
```

**Mobile E2E API**

```bash
npm run mobile:e2e:api
```

**Mobile E2E test-assets**

```bash
npm run mobile:e2e:test-assets
```

Phones installed once (rebuild after any app code change):

```bash
npm run mobile:e2e:ios
npm run mobile:e2e:android
```

## Prompts

Model tiers (per **copy-pasta-recommend-model** rule): **Auto** (mechanical/operator),
**Codex 5.3** (standard RN/E2E), **Opus 4.8** (native/cross-cutting).

- [x] **Step 1 — deep-link + push routing (plan 01).** DONE — both flows pass on iOS + Android.
  Fixes: (1) Home content routes now carry the `home/` prefix in the linking config so
  `getStateFromPath('/home/podcast/:id')` resolves (was returning undefined → fell back to Home);
  (2) `tryParseUrlPath` keeps the URL host as the leading route segment for custom-scheme deep links
  (`podverse-next://podcast/<id>` no longer collapses to Home); (3) new shared
  `confirm-ios-open-dialog.yaml` confirms the iOS "Open in "Podverse Next"?" dialog so the dev client
  reconnects and routes (no-op on Android). Verify:

**Cursor model:** Opus 4.8 — native/RN deep-link + notification URL delivery across
navigation, linking prefixes, and the pending-URL buffer (cross-cutting, highest risk).

```bash
npm run mobile:e2e:test -- deep-link
npm run mobile:e2e:test -- push
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

- [x] **Step 2 — iOS connect flakiness (plan 02).** RESOLVED by Step 1. The iOS
  `"Development servers"` connect failures on `opml`/`deep-link`/`push` were caused by a leftover
  iOS "Open" confirm alert (from own-scheme `openLink`) occluding the launcher on the next flow.
  The Step 1 `confirm-ios-open-dialog.yaml` dismisses it, so no timeout/retry change was needed.
  Confirmed on a **cold-booted** iPhone E2E sim running `opml` → `deep-link` → `push`
  back-to-back with no stuck-alert carryover: iOS 33s / 23s / 23s, Android 1m31s / 38s / 39s — all
  green. (Historical repro steps below if it recurs.)

**Cursor model:** Codex 5.3 — E2E harness judgment with light Maestro yaml edits
(`maxRetries` / `TIMEOUT_SLOWEST`); standard test-infra work.

```bash
xcrun simctl shutdown "iPhone 17 Pro E2E"; xcrun simctl boot "iPhone 17 Pro E2E"
npm run mobile:e2e:test -- opml
npm run mobile:e2e:test -- deep-link
npm run mobile:e2e:test -- push
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

- [x] **Step 3 — tablet flow (plan 03).** DONE — both tablets pass (iOS 33s / Android 1m7s).
  Two fixes: (1) real app render crash — `TabScaffold` used
  `tabBarLabelPosition: 'below-icon'` with `tabBarPosition: 'left'`, which `<BottomTabBar>` throws
  on; now `'beside-icon'`. (2) iOS-tablet dev-client flake — `setOrientation: LANDSCAPE_LEFT`
  destabilized the iPad dev client; gated it to `when: platform: Android` in `tablet.yaml`. The
  iPad is ~1032dp in portrait (≥ `lg`=900) so it renders the left rail + split without rotating;
  only the ~800dp Pixel Tablet needs to rotate. iOS `tablet-podcast-detail.png` confirms the split.

**Cursor model:** Codex 5.3 — iOS-tablet dev-client/orientation harness debugging + RN tab-bar fix.

```bash
bash scripts/mobile/ensure-devices.sh e2e
npm run mobile:e2e:ios:tablet
npm run mobile:e2e:android:tablet
npm run mobile:e2e:test -- tablet
open .artifacts/mobile-e2e-reports/latest/index.html
```

- [x] **Step 4 — final confirmation.** DONE — full phone matrix + tablet all green. Full phone
  matrix (`mobile:e2e:test:all`, run `20260804-120055`): **iOS 22/22** in 11m35s, **Android 22/22**
  in 28m34s, zero FAILED/ERROR (iOS command tally: 819 COMPLETED, 68 SKIPPED optional-guarded steps,
  2 non-fatal WARNED). Tablet (`20260804-124205`): **iOS 1/1** (35s), **Android 1/1** (55s). Ran the
  full matrix instead of repeating deep-link/push/opml individually since those flows are members of
  the matrix.

**Cursor model:** Auto — orchestration only: re-run flows and read the report / failures.json.

```bash
npm run mobile:e2e:test -- deep-link
npm run mobile:e2e:test -- push
npm run mobile:e2e:test -- opml
npm run mobile:e2e:test -- tablet
npm run mobile:e2e:test:all
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/failures.json
```
