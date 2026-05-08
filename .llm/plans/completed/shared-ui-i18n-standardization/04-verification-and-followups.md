# 04 — Verification

## i18n

- `npm run i18n:validate` (repo root)

## Unit

- `npm run test:unit` (or workspace tests for `packages/ui` if split)

## E2E (user-local; UI + i18n)

- Web: `make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts` (or a list spec touching lists)
- Management: `make e2e_test_management_web_report_spec SPEC=e2e/login-super-admin-full-crud.spec.ts`
  (adjust to a spec that covers stats/users if available)

## Follow-ups

- Grep `packages/ui` for new English string literals in `*.tsx` in reviews.
- Consider converging web’s list `Pagination` with `@podverse/ui` in a later plan (optional).
