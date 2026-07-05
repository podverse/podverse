---
name: styles-source-of-truth
description: Design tokens, themes, mixins, and font-faces live in @podverse/ui. Apps must consume them via @podverse/ui/styles/* or the repo-relative packages/ui paths used in this monorepo. Do not duplicate tokens in app SCSS.
---

# styles-source-of-truth

## Source of truth

`packages/ui/src/styles/` is the canonical home for:

- Design tokens (CSS custom properties + SCSS-mirror variables): `_variables.scss`, `_breakpoints.scss`
- Themes (dark/light/dracula/violet/ember/dawn on `[data-ui-theme]`): `_themes.scss`
- Shared SCSS mixins: `_mixins.scss` (includes **`flexItemAllowShrink`** / **`flexItemClampToParent`** in `mixins/_flexShrink.scss` for flex/grid shrink-safe items — use instead of repeating bare `min-width: 0`). **`ellipsisSingleLineParent`** delegates to **`flexItemAllowShrink`**.
- Roboto font-faces: `_font-faces.scss`

## Usage in apps

```scss
// Preferred when the Sass pipeline resolves package exports:
@use '@podverse/ui/styles/variables' as *;
@use '@podverse/ui/styles/mixins' as *;

.x {
  padding: var(--spacing-md);
  color: var(--text-color-primary);

  @include desktop {
    padding: var(--spacing-lg);
  }
}
```

## Resolver note (this monorepo)

If `@use '@podverse/ui/styles/...'` does not resolve in a given app (e.g. some Next.js module SCSS pipelines), use a **repository-relative** path to `packages/ui/src/styles/...` (see existing `*.module.scss` under `apps/management-web`).

## Rules

- **No `var()` fallbacks:** Do not use `var(--token, fallback)` in SCSS/CSS (see **`css-custom-properties-no-var-fallbacks`** skill and **.cursor/rules/css-custom-properties-no-var-fallbacks.mdc**). Missing tokens should be fixed in `_variables-root.scss` / `_themes.scss`, or set on the owning element (e.g. inline **`--modal-content-max-width`** from **`Modal`**), not masked with a second `var()` argument.
- **Buttons and tab-like controls:** Never rely on the browser’s default `<button>` background (e.g. light system “buttonface”). Always set `background-color` (and `color`) using theme tokens so inactive/outline variants stay readable on **every** `[data-ui-theme]` (dark, light, dracula, violet). If text uses `--text-color-primary` / `--button-secondary-color`, the surface must come from `--background-color-*` or another tokenized surface — verify contrast in both dark and light themes.
- Do NOT add new tokens to `apps/web/src/styles/...` or `apps/management-web/src/styles/...` except **forwarder shims** in `apps/web` (one-line `@forward` to `packages/ui`). Add tokens in `packages/ui/src/styles/_variables.scss` (and `_themes.scss` if theme-dependent), and they become available to both apps.
- If page/module styles repeat across multiple pages (forms, table wrappers, badges, header action rows), prefer a reusable React component in `@podverse/ui` rather than adding more duplicated SCSS blocks.
- Theme-dependent values (any color, any gradient, button states) MUST be defined in every built-in theme block in `packages/ui/src/styles/_themes.scss` (`dark`, `light`, `dracula`, `violet`, `ember`, `dawn`).
- **Operator remote custom themes sample:** When theme-scoped `--*` keys change, also update [`docs/operations/branding/custom-themes.operator-sample.json`](/docs/operations/branding/custom-themes.operator-sample.json) (full override reference for operators). See **custom-themes-operator-sample-sync** rule and `customThemesOperatorSample.test.ts`.
- Non-theme values (spacing, font-size, border-radius, breakpoints, etc.) live in `:root` inside `_variables.scss`.
- The default theme (when no `data-ui-theme` is set) is `dark`. Both `:root` and `[data-ui-theme='dark']` declare the same dark palette in `_themes.scss`.
- If you need to change a value used by both apps, change it in `packages/ui/src/styles/` and verify the web and management E2E smoke targets still pass.

## Mobile (React Native)

Web and management-web consume tokens via SCSS/CSS custom properties. Mobile **does not** import
`@podverse/ui` or SCSS.

- **RN-safe export:** `@podverse/design-tokens` — TS maps for colors, spacing, radii per `UITheme`,
  kept in sync with `_themes.scss` and `_variables-root.scss`.
- **Same theme IDs:** `dark`, `light`, `dracula`, `violet`, `ember`, `dawn` — see
  `packages/ui/src/lib/uiTheme/uiTheme.ts` and **mobile-theme-parity** skill.
- When adding or changing a theme-scoped token, update **both** SCSS and `@podverse/design-tokens`.
- Default theme is `dark` on mobile as on web.

## When to break this skill

Never. Token duplication is the bug class this skill exists to prevent.
