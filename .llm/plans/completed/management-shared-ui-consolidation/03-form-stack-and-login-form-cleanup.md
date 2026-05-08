# 03 - Form Stack And Login Form Cleanup

## Assessment

Management-web mostly uses shared form primitives, but the login page still uses raw `<form>`:

- `apps/management-web/src/app/page.tsx`

Web also has an app-local form wrapper whose styles match the shared `FormStack` spacing:

- `apps/web/src/components/Form/Form.tsx`
- `apps/web/src/styles/components/Form/Form.module.scss`
- Existing shared equivalents: `packages/ui/src/components/form/FormContainer/`, `packages/ui/src/components/form/FormStack/`

This is lower risk than selector/menu convergence and helps eliminate one more app-local primitive.

## Prompt

Consolidate raw/local form wrappers onto `@podverse/ui`.

1. Inventory usage:
   - Search web for imports/usages of `apps/web/src/components/Form/Form.tsx`.
   - Search management-web for raw `<form>` usages.
2. Migrate management login:
   - Replace raw `<form>` in `apps/management-web/src/app/page.tsx` with `FormContainer` or the appropriate shared form primitive.
   - Preserve submit behavior and `Button block` layout.
3. Migrate web local `Form`:
   - If all call sites can use `FormContainer`/`FormStack` without visual regression, replace imports and delete `apps/web/src/components/Form/Form.tsx` plus its SCSS.
   - If some web forms need product-specific behavior, keep a thin wrapper around `@podverse/ui` and document why.
4. Tests:
   - Add `@podverse/ui` tests only if form primitive behavior changes.
   - Update page tests if login/form behavior changes.

## Acceptance Criteria

- Management login uses shared form primitives.
- Web local `Form` is removed or reduced to a thin compatibility wrapper around `@podverse/ui`.
- No duplicated form-stack SCSS remains if fully migrated.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/ui -w @podverse/web -w @podverse/management-web
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```
