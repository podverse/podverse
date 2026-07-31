# 469-e2e-opml-export

**Master step:** 16.10
**Model (author + implement):** Auto
**Status:** done

## Scope (shipped)

- **Web:** export download assertion in `apps/web/e2e/settings-opml-export.spec.ts`.
- **Mobile:** Maestro `apps/mobile/e2e/opml.yaml` taps export and asserts success notice
  (share sheet skipped in E2E).

## Verification

```bash
make e2e_test_web_report_spec SPEC=e2e/settings-opml-export.spec.ts
npm run mobile:e2e:test -- opml
```
