# Phase 3 — Form strategy and migration (Shared UI consolidation)

## Preconditions

- Phase 2 complete so **`Button`** and package import patterns are proven.

## Goal

Eliminate parallel **form primitive** drift between apps without breaking web’s large form surface.

## Decision point (pick one before coding)

Document the choice in the inventory or a short ADR note:

### Strategy A — Thin primitives in `packages/ui`

- Export composable **`Input`**, **`TextArea`**, **`Select`**, **`Label`**, **`FieldError`** with
  shared styling only.
- `apps/web` keeps **`TextInput`** as a higher-level composition until a later migration.
- `management-web` adopts primitives first (closest to current `FormInput`).

### Strategy B — Gradual lift of web components

- Move **`Form`** shell (default export in web) and progressively **`TextInput`** (subset of props)
  into `packages/ui`.
- Higher effort; strongest consistency.

**Do not** blindly replace management `FormInput` with full web `TextInput` without an API pass—web
`TextInput` is controlled and includes eyebrow, suffix/prefix, embedded buttons, etc.

## Alignment with existing UI package

- Prefer composing around existing **`FormPrimaryActions`** and **`CheckboxField`** in
  `packages/ui` rather than duplicating footer or checkbox markup in pages.

## Migration steps (outline)

1. Finalize Strategy A or B.
2. Implement chosen primitives or lifted components in `packages/ui`; export from `index.ts`.
3. Migrate **management-web** forms incrementally (`settings`, `flag-status`, login, user/admin
   flows—use Phase 0 inventory order).
4. Optionally migrate **web** consumers in follow-up PRs if Strategy B.

## Verification

- Integration/E2E:
  - Management-web: forms affected by migration (scoped `make e2e_test_management_web_report_spec`).
  - Web: only if web imports changed in this phase—run scoped web E2E per **make** rules.

```bash
make e2e_test_management_web_report_spec SPEC=e2e/users-new-create-username-only.spec.ts
```

## Completion

Mark Prompt 4 in `COPY-PASTA.md`; move this file when done.
