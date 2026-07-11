# `@podverse/design-tokens`

React Native-safe design tokens for Podverse themes.

This package mirrors the six built-in web themes (`dark`, `light`, `dracula`, `violet`, `ember`,
`dawn`) as plain TypeScript objects so `apps/mobile` can style via `StyleSheet` without importing
SCSS or `@podverse/ui`.

## Exports

- `UITheme`
- `ALL_POSSIBLE_THEMES`
- `getThemeTokens(theme)`

`getThemeTokens(theme)` returns:

- `background` color tokens
- `text` color tokens
- `border` color tokens
- `button` color tokens
- shared `spacing` scale
- shared `radii` scale

## Source of truth

- Theme color values: `packages/ui/src/styles/_themes.scss`
- Spacing/radii scale: `packages/ui/src/styles/_variables-root.scss`

When theme or scale tokens change in `packages/ui/src/styles`, update this package in the same
change so web and mobile stay in sync.

## Commands (from monorepo root)

```bash
npm run build -w @podverse/design-tokens
npm run lint -w @podverse/design-tokens
```
