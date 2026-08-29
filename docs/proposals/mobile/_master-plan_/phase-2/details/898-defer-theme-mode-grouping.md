# 898-defer-theme-mode-grouping

**Master step:** P2.3.7
**Model (author + implement):** Codex 5.3
**Status:** draft — deferred to a future phase

## Scope

Today the supported UI themes are a **flat list** — `dark`, `light`, `dracula`, `violet`, `ember`,
`dawn` — with no machine-readable notion of which ones are dark and which are light. Web and mobile
both render that flat list in their theme pickers, and neither can answer "give me this user's dark
theme" or "follow the system appearance."

This step introduces a **theme mode** dimension so every theme declares the mode it belongs to, and
both surfaces group and select themes by mode.

Deferred: this is a cross-surface change touching design tokens, SCSS, web settings, mobile
settings, and the operator custom-theme contract. It is recorded here so it is not lost, and is not
scheduled against a Phase 2 screen area.

In scope when it is picked up:

- A `mode` attribute on every theme (`dark`, `light`, and room for additional modes such as
  `high-contrast`), defined once in the token source of truth and exported to both surfaces.
- Theme pickers on web (`SettingsThemeSelector`) and mobile (`MoreSettingsThemeScreen`) grouped by
  mode rather than presented as one flat list.
- A per-mode theme preference, so "follow system appearance" can resolve to the user's chosen dark
  theme and chosen light theme instead of forcing the single `uit` value.
- Extension of the operator custom-theme contract so remote themes declare their mode.

Out of scope: designing new themes, changing existing token values, or adding a high-contrast
palette. This step only adds the grouping mechanism and the UI that consumes it.

## Acceptance criteria

- Every built-in theme declares a mode, and the value is available to web and mobile from the shared
  token package rather than being duplicated per surface.
- Web and mobile theme pickers render themes grouped under mode headings, localized through the
  existing `settings.ui_theme.*` namespace plus new mode labels.
- A user can pick a dark theme and a light theme independently, and system-appearance following
  resolves to the right one.
- An unknown or missing mode on a remote custom theme degrades gracefully instead of breaking the
  picker.
- Adding a new mode requires changes in the token source of truth only, not in each app.

## Web parity references

- `packages/ui/src/styles/_themes.scss` and `_variables-root.scss` — canonical theme definitions
- `@podverse/design-tokens` — RN-safe export consumed by mobile
- `apps/web/src/components/.../SettingsThemeSelector.tsx` — web theme picker
- `apps/mobile/src/screens/more/MoreSettingsThemeScreen.tsx` — mobile theme picker
- `apps/mobile/src/theme/` — `ThemeProvider`, `useTheme`, `createStyles`
- Skills: **styles-source-of-truth**, **mobile-theme-parity**; rule
  **custom-themes-operator-sample-sync**

## Verification

```bash
npm run build:packages
npm run lint
npm run test:unit
npm run mobile:e2e:test -- settings-theme
```
