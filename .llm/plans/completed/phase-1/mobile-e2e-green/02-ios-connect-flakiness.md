# 02 — iOS late-suite dev-client connect flakiness

## Symptom

`deep-link`, `push`, and `opml` all fail on **iOS** at the shared connect step with
`Assertion is false: "Development servers" is visible` — the `extendedWaitUntil` for the
launcher heading in `apps/mobile/e2e/shared/connect-dev-client.yaml` (lines ~22-24).
`opml` uses no `openLink` yet fails the same way on iOS while passing on Android, proving
this is **environmental**, not a deep-link bug: after ~19 sequential `clearState`
relaunches the iOS dev client / Metro degrades and the cold launcher heading does not
render within `TIMEOUT_SLOWEST`.

Failing runs: `20260804-100459` (opml iOS), plus the iOS side of `deep-link` / `push`.

## Fix approach (cheapest first)

1. **Environment reset, no code change.** Restart Metro and cold-boot a fresh sim, then
   re-run the three flows in isolation:

       # Mobile Metro: Ctrl+C then
       npm run mobile:dev:e2e
       xcrun simctl shutdown "iPhone 17 Pro E2E"; xcrun simctl boot "iPhone 17 Pro E2E"
       npm run mobile:e2e:test -- opml
       npm run mobile:e2e:test -- deep-link
       npm run mobile:e2e:test -- push

   `opml` on iOS most likely goes green on a clean sim with no code change.

2. **If still flaky**, make the shared connect more resilient (do NOT weaken assertions):
   - `apps/mobile/e2e/shared/launch-and-connect.yaml`: raise `retry.maxRetries` 2 → 3.
   - iOS `TIMEOUT_SLOWEST`: confirm where timeouts are defined (Maestro env in
     `scripts/mobile/e2e-test.sh` / Maestro config) and bump the slowest tier for iOS only.
   - Consider an explicit relaunch-with-URL for iOS so the dev client connects straight
     through instead of showing the launcher picker.

## Done when

- `opml`, `deep-link`, `push` pass on iOS-phone (Android already green for opml; deep-link
  and push Android handled in plan 01).
- Any timeout / retry change is scoped and documented in the flow comment.

## RESOLUTION (2026-08-04)

Resolved by Step 1, no code change here. The iOS `"Development servers"` connect failures were
not generic dev-client degradation — they were caused by a leftover iOS "Open in "Podverse Next"?"
SpringBoard alert from a prior own-scheme `openLink` (deep-link/push) occluding the launcher on the
next flow. `shared/confirm-ios-open-dialog.yaml` (Step 1) dismisses the alert, so `opml` passes
(iOS 32s / Android 1m16s) with no `TIMEOUT_SLOWEST`/`maxRetries` change.
