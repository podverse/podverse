# @podverse/ui

Shared UI components for Podverse applications (see `package.json` for the public TypeScript entry).

## Styles

`@podverse/ui` exports SCSS sub-paths consumed by `apps/web` and `apps/management-web`:

- `@podverse/ui/styles/variables` — design tokens (CSS custom properties + SCSS-mirror variables) and breakpoints
- `@podverse/ui/styles/breakpoints` — breakpoint SCSS variables only
- `@podverse/ui/styles/themes` — `dark` / `light` / `dracula` theme blocks
- `@podverse/ui/styles/mixins` — shared SCSS mixins (media queries, layout, form, headers, buttons, etc.)
- `@podverse/ui/styles/font-faces` — Roboto `@font-face` declarations + `body { font-family }`
- `@podverse/ui/styles` — full bundle (font-faces + variables + themes + mixins) for app `globals.scss`

See [`.cursor/skills/styles-source-of-truth/SKILL.md`](../../.cursor/skills/styles-source-of-truth/SKILL.md) (repo root).
