# Plan 02 — Tier D import specifiers and ESLint

**Steps:** 0.2, 0.3
**Model:** Codex 5.3

## Detail references

- [002-tier-d-import-specifiers-doc](/docs/proposals/mobile/_master-plan_/details/002-tier-d-import-specifiers-doc.md)
- [003-eslint-mobile-override](/docs/proposals/mobile/_master-plan_/details/003-eslint-mobile-override.md)

## Proposal context

[DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md),
[import-specifiers-tiered](/.cursor/skills/import-specifiers-tiered/SKILL.md)

## Tasks

1. **Tier D section** — Add Tier D to import-specifiers doc: `apps/mobile/**` uses **extensionless**
   relative imports (Metro bundler); workspace packages use package names (`@podverse/helpers`, etc.).
   Cross-link architecture tier table (Tier 5 consumer).

2. **ESLint** — Add root ESLint override block for `apps/mobile/**` when that path exists, OR add a
   stub `apps/mobile/eslint.config.js` that will be wired in Track 2. Override must allow extensionless
   relative imports and RN globals (`__DEV__`, etc.). If workspace does not exist yet, add the override
   pattern in root config with `files: ['apps/mobile/**/*.{ts,tsx}']` so it activates when files appear.

3. **Skill sync** — If Tier D changes import-specifiers-tiered skill tables, update that skill minimally.

## Acceptance

- Tier D documented; ESLint policy in repo (config or documented deferral with glob ready).

## On completion

Mark steps **0.2, 0.3** as `done`.
