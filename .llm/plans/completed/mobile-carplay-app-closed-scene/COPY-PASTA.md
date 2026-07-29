# COPY-PASTA — mobile-carplay-app-closed-scene

Paste one prompt at a time, in order. Each assumes the plan files in this directory are the source of
truth. Do not edit the plan files while implementing (except filling the "Result" section in 01 and
status boxes here).

Agent policy: implement locally; do not run test/lint/E2E suites; end each response with the
operator's simulator verification steps. Git/`gh` are operator-only.

---

## Step 1 — Verify dynamic scene cold-launches app-closed  [x] done (2026-07-28: PASS — revised)

```
Follow .llm/plans/active/mobile-carplay-app-closed-scene/01-verify-dynamic-scene-app-closed.md.
Determine whether the current dynamic CarPlay scene declaration (AppDelegate
configurationForConnectingSceneSession, no Info.plist scene manifest) cold-launches CarPlay with the
phone app force-quit. Give me exact xcrun simctl + CarPlay Simulator steps to run, and where to read
the scene connect log. Record the outcome in the plan's Result section and set the decision:
skip Step 2 (dynamic path already works app-closed) or proceed to Step 2.
```

Result / decision: **PASS** — dynamic path cold-launches app-closed (force-quit → tap CarPlay icon →
`PodverseNext` cold-launches, App Group container resolved, root template rendered). The
`carplay-audio` entitlement registers the CarPlay Home icon; no Info.plist scene manifest needed.
**Skip Step 2.** Empty root rows = empty cache (no follows/downloads), a UX/data matter deferred to
`docs/proposals/mobile/car-ux-parity/`.

---

## Step 2 — Robust dual-scene adoption (only if Step 1 FAILED)  [–] skipped — not needed (Step 1 PASS)

```
Follow .llm/plans/active/mobile-carplay-app-closed-scene/02-dual-scene-adoption-robust-fix.md.
Implement durable Expo config (extend apps/mobile/plugins/withPodverseCarPlay.js or add a sibling
plugin) to adopt UIScene for BOTH the phone (PodversePhoneSceneDelegate hosting the RN root) and
CarPlay, declared in Info.plist with UIApplicationSupportsMultipleScenes true. The phone app must
still launch with no black screen and SafeArea intact. Confirm the exact SDK 52 RN root-view-factory
API from the installed node_modules before wiring the phone scene delegate. Do not create a second
AVPlayer/MPRemoteCommandCenter. Do not hand-edit ios/. End with the mobile:prebuild + simulator steps
for me to run.
```

---

## Step 3 — App-closed proof, docs, regression guard, archive  [x] done (2026-07-28)

```
Follow .llm/plans/active/mobile-carplay-app-closed-scene/03-verify-and-doc-regression-guard.md.
Give me the exact operator steps to prove app-closed CarPlay (phone force-quit → CarPlay cold-launch
→ browse Library/Downloads → play → phone relaunch no black screen). Then update
CARPLAY-SIMULATOR-CHECKLIST.md, CARPLAY-ENTITLEMENT.md, media-engine README.md, GO-NO-GO.md, and
master-plan detail 386 to the proven path; add the regression-guard comment in withPodverseCarPlay.js
(never a CarPlay-only manifest). After I confirm the proof passes, move this plan set from active/ to
completed/.
```

---

## Cumulative operator verification (run after the last step)

Prereqs in named tabs (see vscode-terminals-commands / HOW-TO-RUN.md):
- **Mobile Metro:** `npm run mobile:dev`

```bash
# Mobile — regenerate native project after plugin/config changes
scripts/nix/with-env npm run mobile:prebuild

# Mobile iOS — install dev build on the named simulator
npm run mobile:ios -- --device "iPhone 17 Pro"

# Mobile CarPlay — app-closed CarPlay proof (force-quit, then tap Podverse on CarPlay Home)
xcrun simctl terminate booted com.podverse.app.next
# enable CarPlay external display (I/O ▸ External Displays ▸ CarPlay), tap the Podverse icon,
# then read the lean scene-connect log (scoped to our process; no carkitd firehose):
xcrun simctl spawn booted log stream --level default \
  --predicate 'process == "PodverseNext" AND (eventMessage CONTAINS[c] "carplay" OR eventMessage CONTAINS "native-cache" OR subsystem == "com.facebook.react.log")'
```
