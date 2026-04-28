---
name: styles-source-of-truth
description: Design tokens, themes, mixins, and font-faces live in @podverse/ui. Apps must consume them via @podverse/ui/styles/* or the repo-relative packages/ui paths used in this monorepo. Do not duplicate tokens in app SCSS.
---


# styles-source-of-truth

## Source of truth

`packages/ui/src/styles/` is the canonical home for:

- Design tokens (CSS custom properties + SCSS-mirror variables): `_variables.scss`, `_breakpoints.scss`
- Themes (dark/light/dracula on `[data-ui-theme]`): `_themes.scss`
- Shared SCSS mixins: `_mixins.scss`
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

- Do NOT add new tokens to `apps/web/src/styles/...` or `apps/management-web/src/styles/...` except **forwarder shims** in `apps/web` (one-line `@forward` to `packages/ui`). Add tokens in `packages/ui/src/styles/_variables.scss` (and `_themes.scss` if theme-dependent), and they become available to both apps.
- Theme-dependent values (any color, any gradient, button states) MUST be defined in all three theme blocks (`dark` / `light` / `dracula`) in `packages/ui/src/styles/_themes.scss`.
- Non-theme values (spacing, font-size, border-radius, breakpoints, etc.) live in `:root` inside `_variables.scss`.
- The default theme (when no `data-ui-theme` is set) is `dark`. Both `:root` and `[data-ui-theme='dark']` declare the same dark palette in `_themes.scss`.
- If you need to change a value used by both apps, change it in `packages/ui/src/styles/` and verify the web and management E2E smoke targets still pass.

## When to break this skill

Never. Token duplication is the bug class this skill exists to prevent.
