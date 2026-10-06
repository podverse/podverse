# Expo SDK 52 → 57 upgrade — COPY-PASTA

## CRITICAL: Execution rules

**SEQUENTIAL PHASES** — wait for each phase before the next:

1. Step 0 (operator commit, preferred) → optional
2. Prompt 01 → WAIT
3. Prompt 02 → WAIT → Prompt 03 (includes **Checkpoint A**, agent-run) → WAIT
4. Prompt 04 → WAIT → Prompt 05 → WAIT
5. Prompt 06 (agent starts/stops E2E stack in background + Maestro) → WAIT
6. Prompt 07 → WAIT
7. Prompt 08 (`eas build` agent-run; Play Console is operator) → archives set

**DO NOT** start 03 until 02 is finished.  
**DO NOT** start 04 until Checkpoint A in 03 is green.

**This set is an exception:** agents **run** the verify commands in each
numbered plan (type-check, unit tests, device builds, Maestro, `eas build`).
Prompt **06** starts and stops E2E Metro / API / test-assets in background
shells — operator VS Code tabs are not required. Agents still do not
`git push` / click Play Console unless asked.

Locked decisions: [00-SUMMARY.md](./00-SUMMARY.md).  
Order detail: [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

## How to use

1. Select **Cursor model** and **Reasoning** in the Cursor UI (line above each fence).
2. Copy **only** the fenced block → paste → agent executes (including gates).
3. Tick the checkbox when that prompt is done.
4. For overnight: paste **01 → 02 → 03 → 04 → 05 → 06 → 07 → 08** as each
   finishes. Keep the Mac awake; `eas whoami` must already work. Play Console
   upload after 08 is morning work.

## Model per prompt

| Prompt | Cursor model | Reasoning | Why this tier |
| ------ | ------------ | --------- | ------------- |
| 01 | Codex 5.3 | high | Exact Expo / RN pin and lockfile work |
| 02 | Codex 5.3 | high | Multi-API JS migrations with clear inventory |
| 03 | Opus 5.5 | extra high | Money path + Checkpoint A |
| 04 | Opus 5.5 | high | Native CarPlay / Swift AppDelegate + iOS build |
| 05 | Opus 5.5 | high | Native gradle / edge-to-edge + Android build |
| 06 | Opus 5.5 | high | Maestro / device fix loop |
| 07 | Cursor Grok 4.7 | medium | Docs / abcmemory |
| 08 | Cursor Grok 4.7 | medium | eas build + Play handoff + archive |

---

## Step 0 — Operator (preferred, no agent paste)

Commit the EAS / Play-setup baseline before Prompt 01 if you can. If skipped,
01 still runs (mixed commit later).

---

## PHASE 1 — Dependency bump

- [x] **01 — Dependency bump**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/01-dependency-bump.md

Follow locked decisions in 00-SUMMARY.md and order in 00-EXECUTION-ORDER.md.
Bump apps/mobile to Expo 57 / RN 0.86 / React 19.2, add react-native-worklets,
drop reanimated babel plugin, move expo-iap to 5.x in package.json, regenerate
the mobile lockfile. Do not rewrite src/ call sites.

This plan set requires agent-run verify: confirm Expo 57 / RN 0.86 / expo-iap 5.x
with the version commands in the plan before ending.
```

---

## PHASE 2 — JS then billing + Checkpoint A

- [x] **02 — JS API migrations**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/02-js-api-migrations.md

Follow 00-SUMMARY.md. Own non-billing call sites only: expo-file-system/legacy,
Reanimated 4 / worklets, React 19 types, notification handler fields, safe-area
and netinfo as needed. Must not touch apps/mobile/src/billing/** or package pins.
Do not run Checkpoint A here — Prompt 03 does.
```

- [x] **03 — Billing expo-iap 5 + Checkpoint A**

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/03-billing-expo-iap.md

Follow 00-SUMMARY.md. Own apps/mobile/src/billing/**. Rewrite Play and StoreKit
clients for expo-iap 5.x; remove deep ExpoIapModule imports; keep BillingClient,
account-token binding, and settle / verify contracts. Update billing unit tests.

This plan set requires agent-run Checkpoint A at the end:
./scripts/nix/with-env npm run type-check:mobile
./scripts/nix/with-env npm --prefix apps/mobile run test
Fix failures (billing first; minimal outside fixes if needed) until green, or stop
with the failure output. Do not start Prompt 04 work in this turn.
```

---

## PHASE 3 — Native iOS then Android

- [x] **04 — iOS native**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/04-ios-native.md

Follow 00-SUMMARY.md. Port withPodverseCarPlay to Swift ExpoAppDelegate; keep
the no CarPlay-only scene-manifest guard; raise iOS deployment target to 16.4;
retire obsolete patch scripts; re-check splash / fmt / sqlite helpers.

This plan set requires agent-run verify:
npm run mobile:reset
npm run mobile:ios -- --device "iPhone 17 Pro"
Fix until the iOS build succeeds, or stop with the failure log.
Do not change Android gradle or androidStatusBar.
```

- [x] **05 — Android native**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/05-android-native.md

Follow 00-SUMMARY.md. Convert local Android modules to expo-module-gradle-plugin
with API 36 fallbacks; fix Kotlin / Media3 as needed; remove androidStatusBar;
audit edge-to-edge insets.

This plan set requires agent-run verify:
npm run mobile:reset
npm run mobile:android -- --device Pixel_6_Pro_API_33
Fix until the Android build succeeds, or stop with the failure log.
Do not rework CarPlay.
```

---

## PHASE 4 — Maestro / device

- [x] **06 — Device and Maestro pass**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/06-device-and-maestro-pass.md

Follow 00-SUMMARY.md. Do not wait for operator VS Code tabs. Start the E2E
stack yourself: npm run mobile:e2e:api:bg, npm run mobile:e2e:test-assets:bg,
and npm run mobile:dev:e2e in a background shell. Health-check, install with
mobile:e2e:ios and mobile:e2e:android, run mobile:e2e:test:all (then focused
re-runs on failure). Tear down API/test-assets/Metro before ending. Defer
CarPlay/USB to morning notes. Stop only on hard environment failure.
```

---

## PHASE 5 — Docs then EAS

- [x] **07 — Guidance and docs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/07-guidance-and-docs.md

Follow 00-SUMMARY.md. Update mobile-expo-monorepo, mobile-ios-simulator,
vscode-terminals-commands, AGENTS.md, APPS-MOBILE.md, and related docs/comments
to Expo SDK 57 / RN 0.86 / iOS 16.4. Future-forward wording only.

This plan set requires agent-run verify: run the rg command in the plan and
clear authoritative SDK 52 hits.
```

- [x] **08 — EAS build and Play handoff** (last)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/completed/mobile-expo-sdk-57-upgrade/08-eas-build-and-play.md

Follow 00-SUMMARY.md and 00-EXECUTION-ORDER.md. Run eas build from apps/mobile
(--profile beta --platform android). Do not git push. Do not claim Play accepted
the upload — write Play Console steps for the operator. After a successful EAS
build, archive the whole mobile-expo-sdk-57-upgrade directory to
.llm/plans/completed/. End with all cumulative verification commands for the set.
If eas whoami fails, stop with login instructions.
```

---

## Cumulative verification (also in Prompt 08 final response)

```bash
npm run build:packages
npm run lint
npm run type-check:mobile
npm --prefix apps/mobile run test
npm run mobile:reset
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

**Mobile Maestro** (E2E leave-running tabs already up per HOW-TO-RUN):

```bash
npm run mobile:e2e:test:all
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
