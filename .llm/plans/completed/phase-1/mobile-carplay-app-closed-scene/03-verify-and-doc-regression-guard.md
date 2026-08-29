# 03 — App-closed proof, docs, regression guard, archive

**Model:** Opus 4.8

## Goal

Prove the app-closed CarPlay requirement on the CarPlay Simulator, document the proven path, add a
guardrail so no future change reintroduces a CarPlay-only scene manifest, and archive the plan set.

## Do

1. **App-closed proof (operator-run, agent documents):**
   - Seed native cache (Library + Downloads).
   - `xcrun simctl terminate booted com.podverse.app.next` (force-quit; do not relaunch).
   - Open CarPlay external display; confirm Podverse cold-launches on CarPlay Home.
   - Browse Library → a channel → an item; browse Downloads; select an item → audio plays via
     `PodverseAudioEngine.shared`; Now Playing shows title; transport (play/pause/skip) works.
   - Relaunch the phone app separately; confirm no black screen, SafeArea intact, single audio
     session (no double playback).
2. **Docs — update to the proven path:**
   - `apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md` — add an explicit
     **"App-closed (phone force-quit) cold-launch"** acceptance section with the exact steps above.
   - `apps/mobile/modules/podverse-media-engine/CARPLAY-ENTITLEMENT.md` — record whether the shipped
     path is dynamic-scene (Step 1 pass) or dual-scene manifest (Step 2), and why.
   - `apps/mobile/modules/podverse-media-engine/README.md` — CarPlay scene section: reflect final
     wiring (plugin + AppDelegate + Info.plist if dual-scene).
   - `apps/mobile/modules/podverse-media-engine/GO-NO-GO.md` — flip app-closed CarPlay to
     **proven** with the simulator evidence (date/device).
   - Master plan detail `docs/proposals/mobile/_master-plan_/phase-1/details/386-ios-carplay-scene-config.md`
     — append an "App-closed verified" note.
3. **Regression guard:**
   - Add a short note in `apps/mobile/plugins/withPodverseCarPlay.js` header comment: never declare a
     **CarPlay-only** `UIApplicationSceneManifest`; if a manifest is added it MUST include the phone
     `UIWindowSceneSessionRoleApplication` too (else black phone screen on SDK 52).
   - Consider an abcmemory rule (`.cursor/rules/`) capturing the same invariant if the user says
     `abcremember`.
4. **Archive:** move this plan set from `.llm/plans/active/mobile-carplay-app-closed-scene/` to the
   mirrored `.llm/plans/completed/phase-1/mobile-carplay-app-closed-scene/` once the proof passes.

## Acceptance criteria

- Documented, dated app-closed CarPlay proof (device + Xcode version) in the checklist + GO-NO-GO.
- Phone app launch regression-free (screenshot or note).
- Guardrail comment/rule in place.
- Plan set archived to `completed/`.

## Do not

- Do not archive until the app-closed proof passes.
- Do not run automated test suites; this gate is manual simulator QA.
