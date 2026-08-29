# Plan 02 — Wire mobile Vitest into a real verification gate

**Severity:** MEDIUM. **Model:** Codex 5.3 (docs + CI wiring; no native code).

## Problem

PG-5 added pure-TS unit suites:

- `apps/mobile/modules/podverse-media-engine/src/bridgeCommandSerialization.test.ts`
- `apps/mobile/modules/podverse-media-engine/src/playbackErrorTaxonomy.test.ts`

with `apps/mobile/vitest.config.ts` and a `"test": "vitest run"` script. But nothing runs them:

- `apps/mobile` is a **standalone install** (own lockfile), excluded from root `npm run test:unit`
  (`scripts/ci/run-workspaces.mjs`), so root unit runs never touch it.
- `.github/workflows/ci.yml` intentionally skips unit tests and its operator checklist lists web
  test commands + mobile **Maestro** only — not `npm --prefix apps/mobile run test`.
- `apps/mobile/e2e/HOW-TO-RUN.md` doesn't mention the unit suite either.

Result: the serialization/taxonomy tests can rot silently (arg-order or validation regressions ship
undetected). This is the only automated coverage of the bridge command contract.

## Goal

Make the mobile Vitest suite part of a documented, runnable gate — matching the repo's "operators run
tests locally; agents don't run tests" policy — without breaking the standalone-install boundary.

## Steps

1. **Docs — operator checklist.** Add `npm --prefix apps/mobile run test` to:
   - `.github/workflows/ci.yml` "run locally before merge" warning text (the mobile section, next to
     the Maestro commands).
   - `apps/mobile/e2e/HOW-TO-RUN.md` (a short "Unit tests (pure modules)" note) and/or
     `apps/mobile/APPS-MOBILE.md` where mobile commands are listed.
2. **CI lane (preferred, low-risk).** Add a `unit` step to the existing mobile lint path. The mobile
   ESLint already runs in CI via `scripts/ci/lint-with-summary.mjs`; add a sibling step (or extend
   the mobile workflow) that runs `npm ci --prefix apps/mobile && npm --prefix apps/mobile run test`
   on the `apps/mobile/**` trigger. Keep it independent from the root workspace install so the
   standalone lockfile is respected. If a dedicated mobile CI unit lane is out of scope for this
   pass, land step 1 (docs) and open a tracked follow-up for the CI step.
3. **Confirm scope guard.** Verify `vitest.config.ts` `include` still excludes native/Expo modules
   (`src/bridge/nativePlaybackBridge.ts` imports `expo-modules-core`); tests must stay Node-only.

## Verification (operator)

```bash
npm --prefix apps/mobile run test
```

Expect the serialization + error-taxonomy suites to pass with no native/Expo import errors.
