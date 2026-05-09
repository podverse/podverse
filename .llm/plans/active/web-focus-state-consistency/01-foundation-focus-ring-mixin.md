# 01 — Foundation: focus-ring mixin + globals

## Deliverables

- `packages/ui/src/styles/mixins/_focus.scss` with `@mixin focus-ring`.
- `@forward 'mixins/focus'` in `packages/ui/src/styles/_mixins.scss`.
- `packages/ui/src/styles/globals/_elements.scss`: `@use '../mixins/focus'`; replace `button:focus`,
  `a:focus`, `summary:focus` with `:focus-visible` + `@include focus-ring`.

## Acceptance

Keyboard Tab shows `--box-shadow-focus`; mouse click does not show focus ring.
