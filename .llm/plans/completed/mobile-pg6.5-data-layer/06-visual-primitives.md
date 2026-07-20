# 06 — Shared visual primitives scaffold

Implement master step **9b.6**.

## Detail docs

- [495-visual-primitives-scaffold](/docs/proposals/mobile/_master-plan_/details/495-visual-primitives-scaffold.md)

## Decision / skills

- [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)
- **mobile-theme-parity**

## Tasks

1. Add `apps/mobile/src/components/primitives/` with `Button`, `Card`, `ListRow`, `ScreenHeader`
   (+ `index.ts` barrel).
2. Add `apps/mobile/src/theme/spacing.ts` and `typography.ts` (or equivalent) driven by
   `@podverse/design-tokens` / `useTheme` — **no hardcoded hex**.
3. i18n: pass localized strings into primitives; no user-facing copy inside them.
4. Smoke: at least one screen or a tiny `__DEV__` usage exercising all four primitives.
5. Mark **9b.6** / **495** `done`.

## Acceptance

- Primitives export from a single index; theme switch updates colors
- No `@podverse/ui` / SCSS import
- This is **not** a full pixel-polish pass

Do not run tests during agent work.
