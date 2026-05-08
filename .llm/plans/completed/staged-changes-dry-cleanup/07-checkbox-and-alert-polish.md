# 07 — Checkbox primitive merge + Alert empty guard

## Goal

Resolve two small overlaps in `@podverse/ui` so callers don't have to choose between
near-identical primitives:

1. Merge [`LabeledCheckbox`](../../../../packages/ui/src/components/form/LabeledCheckbox/LabeledCheckbox.tsx)
   into [`CheckboxField`](../../../../packages/ui/src/components/form/CheckboxField/CheckboxField.tsx)
   (or the reverse).
1. Move the null/empty-string guard from
   [`ManagementInlineErrorAlert.tsx`](../../../../apps/management-web/src/components/Alert/ManagementInlineErrorAlert.tsx)
   into [`Alert`](../../../../packages/ui/src/components/layout/Alert/Alert.tsx) itself.

## Why

### Checkbox merge

Both files render `<label><input type="checkbox" /><span>label</span></label>`:

- `CheckboxField` uses `useId()` for the input id; `LabeledCheckbox` requires explicit
  `id` and `name`.
- `CheckboxField` supports `disabled`; `LabeledCheckbox` supports `className` and a
  wrapper `<div>`.
- They ship separate SCSS modules with similar rules.

Two callers picking between them is unnecessary. The bare `Checkbox` in
`fieldPrimitives` is still useful as the unstyled control.

### Alert empty guard

The wrapper exists only to short-circuit when `message` is empty:

```10:22:apps/management-web/src/components/Alert/ManagementInlineErrorAlert.tsx
if (message === null || message === undefined || message === '') {
  return null;
}
return (<Alert variant={variant} className={className}>{message}</Alert>);
```

This is a generic UX rule, not management-specific. Hardening `Alert` to render
nothing when `children` is empty makes every caller benefit and lets the wrapper go
away.

## Design

### Checkbox merge

- Pick `CheckboxField` as the survivor (auto-id is friendlier; supports `disabled`).
- Add to `CheckboxFieldProps`:

  - `id?: string` (optional explicit id — fall back to `useId()`).
  - `name?: string`.
  - `className?: string` (applied to the wrapping element).
  - `wrapInDiv?: boolean` (when `true`, render `<div className><label>...</label></div>`
    to match `LabeledCheckbox`'s wrapper).

- Migrate `LabeledCheckbox` SCSS rules into `CheckboxField.module.scss` under
  `wrapInDiv`-only selectors (e.g. `.root .option`, `.root .checkboxInput`,
  `.root .label`). Keep the existing `CheckboxField` rules intact.
- Update `packages/ui/src/index.ts` — keep both names exported for one release; have
  `LabeledCheckbox` re-export `CheckboxField` with `wrapInDiv` defaulted to `true` if
  needed for stable callers, and add a JSDoc deprecation pointing to `CheckboxField`.
  Then remove `LabeledCheckbox/` files in the same PR if no callers remain.

  Search for `LabeledCheckbox` and `CheckboxField` to find consumers before deletion.

### Alert empty guard

- In `Alert.tsx`, check `children`:

  ```ts
  if (children === null || children === undefined || children === '') {
    return null;
  }
  ```

- Optional opt-out for the rare "render empty alert shell" case:
  add `renderWhenEmpty?: boolean` (default `false`).
- Delete `apps/management-web/src/components/Alert/ManagementInlineErrorAlert.tsx`.
- Update consumers in `apps/management-web` to use `Alert` from `@podverse/ui`
  directly. Search for `ManagementInlineErrorAlert` to find them.

## Tests

- Vitest update for `CheckboxField.test.tsx` — cover `id`/`name`/`className`/`wrapInDiv`.
- Migrate or delete `LabeledCheckbox.test.tsx`.
- Vitest update for the existing Alert test — assert null render when `children` is
  null/undefined/empty-string and assert opt-out via `renderWhenEmpty`.

## Done when

- One canonical labeled checkbox primitive in `@podverse/ui` covers both prior use
  cases.
- `Alert` returns `null` for empty content unless explicitly opted in.
- `apps/management-web/src/components/Alert/` directory is deleted (or empty).
- `npm run lint`, `npm run build:packages`, and the package's vitest tests pass.
