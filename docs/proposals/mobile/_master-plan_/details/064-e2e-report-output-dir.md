# 064-e2e-report-output-dir

**Master step:** 5.5
**Model (author + implement):** Auto
**Status:** ready

## Scope

- Define `.artifacts/mobile-e2e-reports/latest/` as the canonical mobile report root.
- Ensure `.gitignore` covers generated reports (timestamped + latest symlink/copy).

## Acceptance criteria

- Path documented in APPS-MOBILE and e2e README
- Artifacts directory ignored by git except maybe `.gitkeep` if used

## Verification

```bash
rg -n 'mobile-e2e-reports' apps/mobile/APPS-MOBILE.md apps/mobile/e2e/ .gitignore
```
