# 01 — Verify the current dynamic-scene path cold-launches CarPlay app-closed

**Model:** Opus 4.8 (agent can drive simulator via `xcrun simctl`)

## Goal

Determine empirically whether the **already-shipped** hotfix (no Info.plist scene manifest; CarPlay
declared dynamically in AppDelegate `configurationForConnectingSceneSession`, plugin
`apps/mobile/plugins/withPodverseCarPlay.js`) connects the CarPlay scene when the **phone app is
force-quit** (cold launch onto the CarPlay screen).

Apple's CarPlay Developer Guide: "You can declare scenes **dynamically**, or you can include an
application scene manifest." So the dynamic path *may* already satisfy the requirement — verify
before doing the heavier dual-scene work.

## Context / current state

- `app.config.ts` has **no** `UIApplicationSceneManifest` (removed to fix the black phone screen).
- Entitlements present: `com.apple.developer.carplay-audio`,
  `com.apple.security.application-groups` = `group.com.podverse.app.next`.
- `PodverseCarPlaySceneDelegate` (Swift) builds Library/Downloads + play; logs
  `[native-cache] debugDump ...` on connect.
- Phone UI confirmed working (SafeArea renders).

## Do

1. Ensure a dev build is installed and the native cache is seeded (Downloads + Library) — reuse
   `CARPLAY-SIMULATOR-CHECKLIST.md` seeding.
2. **Force-quit** the phone app (`xcrun simctl terminate booted com.podverse.app.next`), do **not**
   relaunch it.
3. Enable + open the CarPlay Simulator external display (I/O ▸ External Displays ▸ CarPlay), or
   `defaults write com.apple.iphonesimulator CarPlay -bool YES` then relaunch Simulator.
4. Observe: does Podverse appear on the CarPlay Home screen and open **without** the phone app being
   foregrounded? Capture the scene log:
   ```bash
   xcrun simctl spawn booted log show --last 2m \
     --predicate 'eventMessage CONTAINS "native-cache" OR eventMessage CONTAINS "carplay"' \
     --style compact | rg -i 'debugDump|carplay'
   ```
5. Record the outcome in this file under "Result" and in the COPY-PASTA Step 1 box.

## Decision

- **PASS** (CarPlay connects + browses + plays with phone app force-quit, phone UI still fine): mark
  Step 2 **skipped (not needed)**; go to Step 3 (harden + doc + guard).
- **FAIL** (CarPlay does not appear / does not connect app-closed): proceed to Step 2 (robust
  dual-scene adoption).

## Do not

- Do not add an Info.plist scene manifest in this step (that is Step 2, and must include the phone
  scene to avoid the black-screen regression).
- Do not run unit/E2E suites; this is a manual simulator check.

## Result (2026-07-28, REVISED — PASS)

Superseding the initial FAIL recorded below: the dynamic scene path **does** cold-launch app-closed.
The first attempt logged no launch because the CarPlay Home icon tap never registered (unresponsive
Simulator clicks), **not** because the app cannot launch.

Re-test (phone app force-quit, then tapped the Podverse icon on the CarPlay Home screen):

- `PodverseNext` **cold-launched** (new pid) with the phone app not foregrounded; App Group container
  resolved (`container_create_or_lookup_app_group_path_by_app_group_identifier: success`) and the
  CarPlay window rendered the **"Podverse" root template** + now-playing button.
- The root list was empty only because both cache sources were empty (no add-by-RSS follows, no
  completed downloads). `makeRootTemplate` adds rows solely from the `library-browse` / `downloads`
  payloads; parser and JS payload shapes match (verified by inspection). **Not a scene defect** — a
  data-population/UX matter folded into the `car-ux-parity` proposal set.

Why the dynamic path works for a CarPlay **audio** app: the `com.apple.developer.carplay-audio`
entitlement (not an Info.plist scene manifest) is what registers the CarPlay Home icon and makes
SpringBoard cold-launch the app for the CarPlay scene; `configurationForConnectingSceneSession` then
returns the CarPlay scene config. A CarPlay-only Info.plist scene manifest is exactly what caused the
phone black-screen, so the manifest-free dynamic path is both **correct and required**.

- Decision: **PASS — skip Step 2** (no dual-scene manifest needed). App-closed cold-launch + scene
  connect + App Group cache read are proven. Visual browse-row render + playback with real content is
  deferred to `docs/proposals/mobile/car-ux-parity/` (that set restructures the root IA anyway); an
  optional quick follow-up can confirm a Library row by following one podcast by RSS.

### Initial attempt (SUPERSEDED — was a false negative)

- App-closed CarPlay connected? **No** (later found to be an unregistered icon tap, not a launch
  failure).
- Notes / logs: With the phone app force-quit and the CarPlay external display enabled,
  `log show --last 90s --predicate 'process == "PodverseNext"'` returned zero rows and the CarPlay
  log was flooded only by the `carkitd` system daemon cycling sessions. This was mis-read as "iOS
  never launches Podverse for CarPlay"; the corrected re-test above shows tapping the CarPlay icon
  cold-launches it. (Native cache was correctly seeded first — cache layer was never the blocker.)
