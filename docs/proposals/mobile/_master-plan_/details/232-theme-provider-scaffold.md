# 232-theme-provider-scaffold

**Master step:** 7.11
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Add `apps/mobile/src/theme/ThemeProvider.tsx` with React context: `uiTheme`, `setUITheme`, `tokens`.
- Default theme: `dark` (matches web).
- Wrap root app (with navigation shell when present).
- Wire `expo-status-bar` `StatusBar` style from active theme (light/dark content).
- Export `useTheme()` hook from `apps/mobile/src/theme/useTheme.ts`.

## Acceptance criteria

- App root wrapped in `ThemeProvider`
- `useTheme()` returns current `UITheme` and token map
- Default render uses `dark` palette without user pref set
- No `@podverse/ui` or SCSS imports

## Web parity references

- [`apps/web/src/contexts/LocalSettings.tsx`](/apps/web/src/contexts/LocalSettings.tsx)
- [`apps/web/src/app/layout.tsx`](/apps/web/src/app/layout.tsx) — `data-ui-theme` SSR
- **mobile-theme-parity** skill

## Verification

```bash
npm run start -w apps/mobile
test -f apps/mobile/src/theme/ThemeProvider.tsx
test -f apps/mobile/src/theme/useTheme.ts
```
