# Plan 01 — Scaffold and build order

**Steps:** 1.1, 1.9, 1.12, 1.13, 1.14
**Model:** Codex 5.3

## Detail references

- [020-playback-core-package-scaffold](/docs/proposals/mobile/_master-plan_/details/020-playback-core-package-scaffold.md)
- [028-build-packages-playback-core](/docs/proposals/mobile/_master-plan_/details/028-build-packages-playback-core.md)
- [031-architecture-playback-core-tier](/docs/proposals/mobile/_master-plan_/details/031-architecture-playback-core-tier.md)
- [032-packages-playback-core-doc](/docs/proposals/mobile/_master-plan_/details/032-packages-playback-core-doc.md)
- [033-playback-core-dependency-audit](/docs/proposals/mobile/_master-plan_/details/033-playback-core-dependency-audit.md)

## Tasks

1. Create `packages/playback-core/` mirroring `packages/helpers-validation` (package.json, tsconfig,
   vitest.config.ts, eslint).
2. Add `playback-core` to root `build:packages` and `build:packages:prod` immediately after `helpers`.
3. Update `.llm/context/architecture.md` tier table with playback-core (Tier 1, depends on helpers).
4. Add `PACKAGES-PLAYBACK-CORE.md` contributor doc.
5. Confirm `dependencies` lists only `@podverse/helpers`.

## On completion

Mark steps **1.1, 1.9, 1.12, 1.13, 1.14** as `done`.
