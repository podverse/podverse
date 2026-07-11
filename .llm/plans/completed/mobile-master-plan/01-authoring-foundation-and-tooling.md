# Authoring: Tracks 0, 1, 3, 5 — foundation and tooling

**Phase:** A (run first, alone). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-00-01-03-05.md`

**Detail ID range:** 001–079

## Instructions for the executing agent

1. Create the output file (and parent directories if missing).
2. Write four Track sections in order: **Track 0**, **Track 1**, **Track 3**, **Track 5**.
3. For each step below, emit one master-plan line in this exact format:

   ```markdown
   N.M. One-sentence summary. Model: <Auto|Codex 5.3|Opus 4.8>. Detail: [NNN-slug](/docs/proposals/mobile/_master-plan_/details/NNN-slug.md) — _TBD_
   ```

4. Use the provided summary text and **Model** value verbatim (minor grammar fixes only).
5. Do **not** create detail files under `details/`.
6. At the top of the output file, include a short Track header with purpose and proposal doc links.

## Track 0 — Monorepo, Tier D, abcmemory prep

**Purpose:** Prepare the monorepo and Cursor for `apps/mobile` before app code (from Track A proposals).

Reference:
[DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md),
[DOCS-MOBILE-LLM-CURSOR-SETUP.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 0.1 | Add `.cursorignore` entries for `apps/mobile/ios/Pods/`, Android build dirs, and `.expo/`. | Auto | 001-cursorignore-native-artifacts |
| 0.2 | Document Tier D import-specifier rules for `apps/mobile/**` in import-specifiers doc. | Codex 5.3 | 002-tier-d-import-specifiers-doc |
| 0.3 | Add ESLint override block for `apps/mobile/**` (extensionless imports, RN globals). | Codex 5.3 | 003-eslint-mobile-override |
| 0.4 | Exclude `apps/mobile` from root `test:unit` until RN Vitest config is ready. | Auto | 004-exclude-mobile-test-unit |
| 0.5 | Exclude or scope `apps/mobile` from root lint sweep until RN ESLint is configured. | Auto | 005-exclude-mobile-lint |
| 0.6 | Create `apps/mobile/AGENTS.md` with allowed/forbidden `@podverse/*` imports. | Codex 5.3 | 006-mobile-agents-md |
| 0.7 | Create `apps/mobile/APPS-MOBILE.md` contributor guide (commands, layout, toolchain). | Codex 5.3 | 007-apps-mobile-md |
| 0.8 | Add `.cursor/rules/mobile-react-native.mdc` (RN boundaries, no Next/ui/orm). | Codex 5.3 | 008-rule-mobile-react-native |
| 0.9 | Add `.cursor/rules/mobile-carplay-android-auto.mdc` (native cache contract pointer). | Opus 4.8 | 009-rule-mobile-car-native |
| 0.10 | Add `.cursor/skills/mobile-playback/SKILL.md` mapping web policy to native bridge. | Opus 4.8 | 010-skill-mobile-playback |
| 0.11 | Add `.cursor/skills/mobile-e2e-screenshots/SKILL.md` for Maestro/Detox screenshot reports. | Codex 5.3 | 011-skill-mobile-e2e-screenshots |
| 0.12 | Add `.cursor/skills/mobile-fdroid-flavors/SKILL.md` documenting FOSS vs playstore flavors. | Codex 5.3 | 012-skill-mobile-fdroid-flavors |
| 0.13 | Update root [AGENTS.md](/AGENTS.md) directory map with `apps/mobile` Tier 5 note. | Auto | 013-root-agents-mobile-entry |
| 0.14 | Update [.cursorrules](/.cursorrules) with mobile tier, `-w apps/mobile` commands pointer. | Auto | 014-cursorrules-mobile-note |
| 0.15 | Add `.cursor/skills/mobile-worktree-scope/SKILL.md` for parallel LLM sessions per Track. | Codex 5.3 | 015-skill-mobile-worktree-scope |
| 0.16 | Define abcmemory checklist: when to update rules/skills vs `.llm/` plans. | Codex 5.3 | 016-abcmemory-update-checklist |
| 0.17 | Add mobile package import allowlist/denylist to `apps/mobile/AGENTS.md` (mirror shared-vs-divergent). | Codex 5.3 | 017-mobile-import-allowlist |
| 0.18 | Document Metro monorepo resolver requirements in `APPS-MOBILE.md`. | Codex 5.3 | 018-metro-monorepo-doc |
| 0.19 | Add `.cursorignore` for `apps/mobile/**/*.hbc` and Xcode user data if not already covered. | Auto | 019-cursorignore-generated-assets |

## Track 1 — Extract `packages/playback-core`

**Purpose:** Share pure playback/queue policy between web and mobile before mobile consumes it.

Reference:
[DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md) §3,
[DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 1.1 | Create `packages/playback-core` workspace with package.json mirroring helpers pattern. | Codex 5.3 | 020-playback-core-package-scaffold |
| 1.2 | Move `resolvePlaybackLoadDecision.ts` and types from web lib/playback into playback-core. | Opus 4.8 | 021-move-resolve-playback-decision |
| 1.3 | Move `playbackTarget.ts`, `playbackLoadRequest.ts`, and related target helpers. | Opus 4.8 | 022-move-playback-target-types |
| 1.4 | Move `resumeSeekFromAbridged.ts`, `clampNearEndSeconds.ts`, `parsePlaybackSeconds.ts`. | Opus 4.8 | 023-move-resume-seek-helpers |
| 1.5 | Move enclosure-switch decision helpers into playback-core. | Opus 4.8 | 024-move-enclosure-switch-policy |
| 1.6 | Move `combineQueueNowPlayingAndUpcoming.ts` from web lib/queue into playback-core. | Opus 4.8 | 025-move-combine-queue-helper |
| 1.7 | Move unit tests from web lib/playback and lib/queue `__tests__/` into playback-core. | Opus 4.8 | 026-move-playback-core-tests |
| 1.8 | Export public API from `packages/playback-core/src/index.ts`. | Codex 5.3 | 027-playback-core-index-exports |
| 1.9 | Add playback-core to `build:packages` ordered list immediately after helpers. | Auto | 028-build-packages-playback-core |
| 1.10 | Update web app to import policy from `@podverse/playback-core` (re-export or direct). | Opus 4.8 | 029-web-consume-playback-core |
| 1.11 | Verify web playback behavior unchanged after extraction (operator runs unit tests). | Auto | 030-web-playback-regression-verify |
| 1.12 | Document playback-core tier placement in architecture.md. | Auto | 031-architecture-playback-core-tier |
| 1.13 | Add PACKAGES-PLAYBACK-CORE.md contributor doc under packages/playback-core. | Codex 5.3 | 032-packages-playback-core-doc |
| 1.14 | Ensure playback-core depends only on `@podverse/helpers` (no DOM, no RN). | Codex 5.3 | 033-playback-core-dependency-audit |

## Track 3 — App bootstrap (hello-world)

**Purpose:** Stand up Expo prebuild skeleton and prove iOS + Android run early.

Reference:
[DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md),
[DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md) §2

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 3.1 | Create `apps/mobile/package.json` with Expo prebuild and dev-client dependencies. | Codex 5.3 | 040-mobile-package-json |
| 3.2 | Add `app.json` / `app.config.ts` with **separate bundle id** (e.g. `com.podverse.app.next`). | Codex 5.3 | 041-expo-config-separate-bundle-id |
| 3.3 | Configure `metro.config.js` with repo-root `watchFolders` and workspace resolution. | Codex 5.3 | 042-metro-config-monorepo |
| 3.4 | Add `apps/mobile/tsconfig.json` extending base with RN jsx and bundler resolution. | Codex 5.3 | 043-mobile-tsconfig |
| 3.5 | Add root convenience scripts: `dev:mobile`, `mobile:ios`, `mobile:android`. | Auto | 044-root-mobile-npm-scripts |
| 3.6 | Run `expo prebuild` to generate `ios/` and `android/` native projects. | Codex 5.3 | 045-expo-prebuild-initial |
| 3.7 | Implement hello-world screen showing app name and version on both platforms. | Codex 5.3 | 046-hello-world-screen |
| 3.8 | Verify Metro starts and loads `@podverse/helpers` dist after `build:packages`. | Auto | 047-hello-world-shared-package-smoke |
| 3.9 | Document Xcode and Android SDK prerequisites in APPS-MOBILE.md (outside Nix shell). | Auto | 048-native-toolchain-prerequisites |
| 3.10 | Add `.gitignore` entries for mobile native build output and `.expo/`. | Auto | 049-mobile-gitignore |
| 3.11 | Configure iOS background audio mode placeholder in Info.plist via config plugin. | Codex 5.3 | 050-ios-background-audio-plist |
| 3.12 | Configure Android foreground service permission placeholders for future media engine. | Codex 5.3 | 051-android-foreground-service-perms |
| 3.13 | Add initial `src/navigation/` and `src/screens/` directory scaffold. | Auto | 052-mobile-src-scaffold |
| 3.14 | Create dev-client build and install on physical iOS device (operator). | Auto | 053-dev-client-ios-device |
| 3.15 | Create dev-client build and install on physical Android device (operator). | Auto | 054-dev-client-android-device |
| 3.16 | Record hello-world success criteria in master plan exit checklist for Track 3. | Auto | 055-track-3-exit-criteria |

## Track 5 — Mobile E2E + screenshots harness

**Purpose:** Establish device E2E with screenshots from the first feature; not Playwright.

Reference:
[DOCS-MOBILE-PROCESS-ROADMAP.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-ROADMAP.md) §8

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 5.1 | Decide E2E framework: Maestro (recommended default) vs Detox; record open decision if unset. | Codex 5.3 | 060-e2e-framework-decision |
| 5.2 | Create `apps/mobile/e2e/` directory and naming convention mirroring web spec paths. | Auto | 061-e2e-directory-layout |
| 5.3 | Add hello-world Maestro/Detox flow asserting app launches and shows title. | Codex 5.3 | 062-e2e-hello-world-flow |
| 5.4 | Configure screenshot capture on each flow step (Maestro `takeScreenshot` or Detox artifact). | Codex 5.3 | 063-e2e-screenshot-capture-config |
| 5.5 | Define report output directory `.artifacts/mobile-e2e-reports/latest/`. | Auto | 064-e2e-report-output-dir |
| 5.6 | Add Makefile targets `mobile_e2e_test` and `mobile_e2e_test_report_spec` at repo root. | Codex 5.3 | 065-makefile-mobile-e2e-targets |
| 5.7 | Document operator commands in APPS-MOBILE.md (from monorepo root). | Auto | 066-e2e-operator-commands-doc |
| 5.8 | Add abcmemory rule: every new mobile feature PR includes matching e2e flow + screenshot. | Codex 5.3 | 067-rule-feature-requires-e2e |
| 5.9 | Add CI job stub (non-blocking) running hello-world e2e on simulator when macOS runner available. | Codex 5.3 | 068-ci-e2e-stub-job |
| 5.10 | Create e2e seed/env doc for test API base URL (reuse podverse test env patterns). | Codex 5.3 | 069-e2e-test-env-doc |
| 5.11 | Add `.cursor/skills/mobile-e2e-screenshots/SKILL.md` cross-link to web ui-e2e-screenshot-report. | Auto | 070-skill-e2e-screenshot-parity |
| 5.12 | Define spec naming: `e2e/<area>.yaml` (Maestro) or `e2e/<area>.e2e.ts` (Detox). | Auto | 071-e2e-spec-naming-convention |
| 5.13 | Add parallel-worktree note: e2e specs are safe to author in isolation per feature Track. | Auto | 072-e2e-parallel-worktree-guidance |

## Output template

```markdown
# Draft: Tracks 0, 1, 3, 5

## Track 0 — Monorepo, Tier D, abcmemory prep

0.1. ...
...

## Track 1 — Extract packages/playback-core

1.1. ...
...

## Track 3 — App bootstrap (hello-world)

3.1. ...
...

## Track 5 — Mobile E2E + screenshots harness

5.1. ...
...
```

## Verification

- Output file exists at the path above.
- Steps 0.1–0.19, 1.1–1.14, 3.1–3.16, 5.1–5.13 all present.
- Every step has `Model:` and `Detail:` link with `_TBD_` suffix.
- Detail IDs 001–079 used without gaps within this file's assigned slugs.
