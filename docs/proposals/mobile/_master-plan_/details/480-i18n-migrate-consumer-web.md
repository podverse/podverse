# 480-i18n-migrate-consumer-web

**Master step:** 17.11
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Move web consumer namespaces from `apps/web/i18n/originals/` to
  `packages/i18n-catalog/consumer/originals/`.
- Web imports merged `shared + consumer` compiled JSON (step 17.0 pattern).
- Keep thin shim or re-export path during transition if needed.

## Acceptance criteria

- Web app strings unchanged in E2E smoke (operator verifies)
- No duplicate en-US maintenance in two trees

## Verification

```bash
npm run i18n:compile
npm run build -w apps/web
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts
```
