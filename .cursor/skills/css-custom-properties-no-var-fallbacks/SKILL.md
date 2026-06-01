---
name: css-custom-properties-no-var-fallbacks
description: Never use the second argument to CSS var() in SCSS/CSS or inline styles; no nested var fallbacks.
version: 1.0.0
---

# CSS custom properties — no `var()` fallbacks

**When to use:** Editing **`*.scss`**, **`*.css`**, or React **`style`** strings that reference **`var(--token)`** in this monorepo (especially **`packages/ui`** tokens and component-local vars like **`--modal-content-max-width`**).

## Rule

- **Do not** write **`var(--token, fallback)`** — no hex, **`inherit`**, **`0`**, or pixel defaults as the second argument.
- **Do not** chain **`var(--a, var(--b))`** to hide a missing **`--a`**.
- **Do** use **`var(--your-token)`** with **one** argument only.
- **Do** ensure the property exists where it must apply:
  - **Theme / scale tokens:** define or extend them in **`packages/ui/src/styles/`** (`_variables-root.scss`, **`_themes.scss`**, etc.).
  - **Component-driven tokens** (e.g. **`--modal-content-max-width`**): set them from **`Modal.tsx`** inline style on the element that owns the class — **never** paper over absence with a SCSS fallback.

Fallbacks hide missing or mistyped custom properties and make theme bugs easy to miss in review.

## Authority

Workspace rule: [`.cursor/rules/css-custom-properties-no-var-fallbacks.mdc`](/.cursor/rules/css-custom-properties-no-var-fallbacks.mdc).

Related: **`styles-source-of-truth`** for where canonical tokens live.
