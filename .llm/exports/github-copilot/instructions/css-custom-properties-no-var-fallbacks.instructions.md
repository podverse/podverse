---
description: "Do not use CSS var() fallback arguments in SCSS/CSS; rely on canonical theme tokens"
applyTo:
  - "**/*.scss"
  - "**/*.css"
---

# CSS custom properties — no `var()` fallbacks

## Do not

- Use the **second argument** to `var()` as a silent fallback: `var(--token, #hex)`, `var(--token, inherit)`, etc.
- Use **nested fallbacks** such as `var(--a, var(--b))` to paper over a missing `--a` — the outer form still hides when `--a` is absent.

Fallbacks mask missing or mistyped custom properties and make theme bugs hard to see in review.

## Do

- Reference tokens that are defined in **`packages/ui/src/styles/`** — especially `_variables-root.scss` (`:root` scale) and `_themes.scss` (theme palettes on `[data-ui-theme]`).
- If a value is missing, **add or extend a named token** in those files (and mirror SCSS variables in `_variables.scss` when the package uses Sass mirrors), then use `var(--your-token)` with **one** argument.

## Inline styles (React `style`, Storybook decorators)

Apply the same rule: no `var(--x, fallback)` in style object strings.
