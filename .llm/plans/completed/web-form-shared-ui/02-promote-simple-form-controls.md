# 02 — Promote simple form controls

## Prompt (Agent)

Execute **phase 02**: promote Checkbox (labeled), RadioButton, SwitchButton, and InlineForm into
`packages/ui/src/components/form/` (or adjacent folders per convention), port web SCSS as the visual
source of truth, export from `packages/ui/src/index.ts`, and update **only** call sites needed for
compilation in this slice if doing incremental migration; otherwise prepare exports for phase 05.

## Goals

- **Web visual baseline** for all moved SCSS (tokens via existing `@podverse/ui` stylesheets; no
  duplicated magic numbers where mixins/variables exist — see `styles-source-of-truth` skill).
- **i18n:** strings and `aria-label` values remain props; no English defaults for visible copy.
- Prefer **`'use client'`** only where hooks or browser-only behavior require it (match current web
  components).

## Suggested package layout

Lowercase directories under `packages/ui/src/components/form/`:

- `LabeledCheckbox/` or merge into `CheckboxField/` (see phase 01 decision)
- `RadioButton/`
- `SwitchButton/`
- `InlineForm/`

Each folder: component `.tsx`, co-located `.module.scss`, optional `index.ts`.

## Exports

Add types + components to [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts) in the
form section alphabetically / grouped with existing form exports.

## Tests

- Add Vitest + Testing Library tests for interactive controls (keyboard, disabled state) where logic
  exceeds trivial rendering.

## Completion checklist

- [ ] SCSS matches web screenshots or computed styles for key states (default, focus, disabled).
- [ ] No `any`; strict equality; separate `import type` lines per repo ESLint rules.
- [ ] Storybook: add or update stories if `packages/ui` Storybook covers form controls (follow repo
  Storybook skill if present).
