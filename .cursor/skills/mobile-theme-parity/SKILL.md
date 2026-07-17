---
name: mobile-theme-parity
description: Cross-platform theme AND visual parity for apps/mobile — same theme IDs and design tokens as web, RN ThemeProvider, uit pref, and web-referenced screen layouts. Use when adding mobile styling, ThemeProvider, theme selector, design token imports, or building any mobile screen that has a web counterpart.
---

# Mobile theme + visual parity (web + mobile)

Mobile and web share **supported theme IDs and semantic token values**, not the same UI stack.
Mobile screens should also **mirror the web app's visual design** where a counterpart exists (see
§ Screen & visual parity below).

## Supported themes

Same as web — from `@podverse/ui` / `@podverse/design-tokens`:

`dark`, `light`, `dracula`, `violet`, `ember`, `dawn`

Default when unset: **`dark`** (matches web `:root` / `[data-ui-theme='dark']`).

## What mobile imports

| Allowed                                                                              | Forbidden                              |
| ------------------------------------------------------------------------------------ | -------------------------------------- |
| `@podverse/design-tokens` (RN-safe TS token maps)                                    | `@podverse/ui` components              |
| `UITheme`, `ALL_POSSIBLE_THEMES` from design-tokens or `@podverse/ui` type re-export | SCSS, CSS custom properties at runtime |
| Theme labels via i18n `settings.ui_theme.*`                                          | Hardcoded hex colors in screens        |

## Pref storage

- Web: `localSettings` cookie, key **`uit`** (`apps/web/src/utils/localSettings/`).
- Mobile: MMKV or AsyncStorage with **same key semantics** (`uit`); full store in Track 16.1.
- Optional v1.1: honor `Appearance.getColorScheme()` when `uit` unset; still default to `dark`.

## Implementation pattern

```
apps/mobile/src/theme/
├── ThemeProvider.tsx   # Context: uiTheme, setUITheme, token map
├── useTheme.ts         # Hook for screens
└── createStyles.ts     # Map design-tokens → StyleSheet factories
```

- Wrap app root (with nav shell, Track 7.11+).
- Wire `StatusBar` style from active theme.
- Settings theme selector (Track 16.3): same ids as web `SettingsThemeSelector.tsx`.

## Token source of truth

SCSS in `packages/ui/src/styles/_themes.scss` and `_variables-root.scss` remains canonical for web/management-web.

When adding or changing theme-scoped tokens:

1. Update SCSS in `packages/ui/src/styles/`.
2. Sync `@podverse/design-tokens` RN export (see **styles-source-of-truth** skill).
3. Update operator sample JSON if applicable (**custom-themes-operator-sample-sync** rule).

## Screen & visual parity — reference the web app

When building **any** `apps/mobile` screen that has a web counterpart, **look at the web app first**
and mirror its design, adapted to React Native:

1. **Find the web source** — the route client under `apps/web/src/app/<area>/` and/or the component
   under `apps/web/src/components/<Area>/`. Cite it in the detail doc's **Web parity references**.
2. **Mirror the information hierarchy and layout** — header/hero, section order, list vs grid, row
   card structure (artwork + title + metadata + actions), selector/tab placement, and
   loading / empty / error states. Match web semantics; do not invent a different IA.
3. **Adapt, don't port** — use RN primitives (`View`, `FlatList`, `Pressable`, `Image`) and
   `StyleSheet` factories from `createStyles.ts`; never import `@podverse/ui` or SCSS.
4. **Tokens only** — all colors, spacing, and radii come from `@podverse/design-tokens` via the
   theme. **No hardcoded hex** in screens (enforced by this skill + `mobile-react-native` rule).
5. **Diverge only with reason** — platform conventions (native back, pull-to-refresh, bottom sheets,
   safe-area, tab bar) win over pixel-copying the web chrome. Note intentional divergences in the
   detail doc.

Reference this section from screen detail docs (e.g. Tracks 8–9 home/browse screens) instead of
re-describing the rule per screen.

## Deferred (post-v1)

- Operator **remote custom themes** (`NEXT_PUBLIC_CUSTOM_THEMES_URL`) — web-only until mobile step lands.
- Brand logo variant by theme (web: `getBrandLogoSrc(uiTheme)`).

## Related

- **styles-source-of-truth** — SCSS + design-tokens sync
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md) — theme row in parity matrix
- Master plan Track 7.11–7.16 (PG-4), Track 16.1/16.3
