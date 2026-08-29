# mobile-carplay-app-closed-scene — guarantee CarPlay works with the phone app closed

**Owner surface:** `apps/mobile` (iOS) + `apps/mobile/modules/podverse-media-engine`
**Master plan tie-in:** Track 12 (12.7 scene config) — hardening/regression follow-up
**Related completed set:** `.llm/plans/completed/phase-1/mobile-pg8-car-carplay/`

## Why this plan exists

PG-8 Step 1 declared a **CarPlay-only** `UIApplicationSceneManifest` in `app.config.ts`. On Expo
SDK 52 / RN New Arch that **suppressed the phone `UIWindowScene`** → `RCTKeyWindow()` returned nil →
`RNCSafeAreaProvider` crashed (`Cannot read property 'width' of undefined`) → **black phone screen**.

Hotfix (already applied): removed the Info.plist scene manifest and wired CarPlay dynamically from
AppDelegate `configurationForConnectingSceneSession` (`apps/mobile/plugins/withPodverseCarPlay.js`).
Phone UI works again, **but app-closed CarPlay cold-launch is now unproven** — the critical
requirement (get in the car, phone app force-quit, browse + play) is at risk.

## Goal (ship bar)

CarPlay browses **Library + Downloads** from the native cache and plays through
`PodverseAudioEngine.shared` with the **phone app force-quit / JS runtime dead**, AND the phone app
still launches normally (no black screen, SafeArea intact). Both must be true simultaneously.

## Strategy (cheap-verify → robust-fix)

1. **Verify** whether the current *dynamic* scene declaration already cold-launches CarPlay
   app-closed (Apple allows declaring scenes dynamically via
   `configurationForConnectingSceneSession`). If it works app-closed, we harden + document and stop.
2. If dynamic declaration does **not** cold-launch app-closed, implement the **robust dual-scene
   adoption**: a phone `UIWindowScene` delegate (hosts the RN root) **and** the CarPlay scene, both
   declared in Info.plist with `UIApplicationSupportsMultipleScenes = true`. This is what Apple's
   CarPlay Developer Guide shows and is the guaranteed path.

## Key constraints (do not regress)

- Phone app must keep launching (no black screen; `RCTKeyWindow()` non-nil; SafeArea renders).
- One shared `AVPlayer` + one `MPRemoteCommandCenter` (engine owns them) — no second player/center.
- Durable Expo config only — the gitignored `ios/` must regenerate correctly via `mobile:prebuild`
  (config plugin or app.config.ts), never one-off Xcode edits.
- No `react-native-track-player`; car code stays native (Swift), JS may be dead.
- App Group `group.com.podverse.app.next` stays wired to `PodverseNativeCache.appGroupIdentifier`.

## Deliverables

- Robust phone + CarPlay dual-scene adoption (config plugin) OR documented proof the dynamic path
  cold-launches app-closed.
- Updated `withPodverseCarPlay.js`, `CARPLAY-ENTITLEMENT.md`, `CARPLAY-SIMULATOR-CHECKLIST.md`,
  media-engine `README.md`, and `GO-NO-GO.md` reflecting the proven app-closed path.
- Regression note so no future change reintroduces a CarPlay-only manifest.

## Files

- `00-EXECUTION-ORDER.md` — run order
- `01-verify-dynamic-scene-app-closed.md` — cheap empirical check first
- `02-dual-scene-adoption-robust-fix.md` — phone + CarPlay scenes (the guaranteed fix)
- `03-verify-and-doc-regression-guard.md` — app-closed proof + docs + guardrail
- `COPY-PASTA.md` — prompts
