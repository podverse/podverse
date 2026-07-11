# 02 — Theme provider and styles

Implement master steps **7.11–7.12** per detail docs
[232-theme-provider-scaffold](/docs/proposals/mobile/_master-plan_/details/232-theme-provider-scaffold.md) and
[233-theme-token-stylesheet](/docs/proposals/mobile/_master-plan_/details/233-theme-token-stylesheet.md).

## Tasks

1. Add `apps/mobile/src/theme/ThemeProvider.tsx`, `useTheme.ts`, `createStyles.ts`.
2. Depend on `@podverse/design-tokens` in `apps/mobile/package.json`.
3. Wrap `App.tsx` root in `ThemeProvider`; default `dark`.
4. Wire `StatusBar` from expo-status-bar.
5. Mark steps 7.11–7.12 `done` when complete.

Prerequisite: step 0.20 (`@podverse/design-tokens` exists).

Do not run tests during agent work. End with operator verification commands.
