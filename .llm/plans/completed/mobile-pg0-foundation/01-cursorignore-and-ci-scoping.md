# Plan 01 — Cursorignore and CI scoping

**Steps:** 0.1, 0.4, 0.5, 0.19
**Model:** Auto

## Detail references

- [001-cursorignore-native-artifacts](/docs/proposals/mobile/_master-plan_/details/001-cursorignore-native-artifacts.md)
- [004-exclude-mobile-test-unit](/docs/proposals/mobile/_master-plan_/details/004-exclude-mobile-test-unit.md)
- [005-exclude-mobile-lint](/docs/proposals/mobile/_master-plan_/details/005-exclude-mobile-lint.md)
- [019-cursorignore-generated-assets](/docs/proposals/mobile/_master-plan_/details/019-cursorignore-generated-assets.md)

## Proposal context

[DOCS-MOBILE-LLM-CURSOR-SETUP.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md) §2,
[DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md) §2

## Tasks

1. **`.cursorignore`** — Append mobile native/build exclusions (Pods, Gradle, build dirs, `.expo/`,
   optional `node_modules` under mobile, `**/*.hbc`, Xcode `xcuserdata`). Do not hide `.env.example`
   allowlist behavior.

2. **`test:unit` scoping** — Add `--exclude apps/mobile` to root `test:unit` in `package.json` (or
   equivalent in `scripts/ci/run-workspaces.mjs` docs) so future mobile workspace does not break unit
   tier before RN Vitest exists.

3. **Lint scoping** — Document in a short comment near root `lint` script OR add exclude for
   `apps/mobile` until RN ESLint config lands (Track 2). Prefer exclude over failing lint on missing
   workspace.

## Acceptance

- All four detail acceptance criteria satisfied.
- No implementation of Expo/RN app code.

## On completion

Mark steps **0.1, 0.4, 0.5, 0.19** as `done` in master plan and detail headers.
