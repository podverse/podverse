# 05 — Serialization tests + FOSS register (2.28, 2.31)

**Cursor model:** Codex 5.3  
**Details:** [107](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/107-bridge-command-serialization-tests.md),
[110](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/110-engine-fdroid-deps-register.md)

## Goal

Vitest coverage for pure bridge command serialization (no native), and an accurate FOSS/F-Droid
dependency register note for the engine (Media3 today; no silent Play Services).

## Implement

1. Pure TS serialize/validate helpers for load / loadAndStart / attach / animate payloads + Vitest.
2. Wire a runnable scoped test script if missing (document command in detail 107).
3. Update FOSS register stub / `mobile-fdroid-flavors` references with engine deps.

## Do not

- Mark 2.29 / 2.30 again — already `done`.
- Add proprietary SDKs.

## Done when

- Steps 2.28 and 2.31 `done`.

## Verification (operator)

```bash
npm run test -w apps/mobile
# or the engine package script introduced by this prompt
rg -n "media3|FOSS|ExoPlayer" apps/mobile/modules/podverse-media-engine .cursor/skills/mobile-fdroid-flavors
```
