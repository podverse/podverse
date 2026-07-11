# 481-i18n-migrate-management

**Master step:** 17.12
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Move management-web namespaces to `packages/i18n-catalog/management/originals/`.
- Management-web imports merged `shared + management` compiled JSON.
- Shared keys no longer duplicated in management tree.

## Acceptance criteria

- Management-web strings unchanged in smoke E2E (operator verifies)
- Translate CI covers management layer

## Verification

```bash
npm run i18n:compile
npm run build -w apps/management-web
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```
