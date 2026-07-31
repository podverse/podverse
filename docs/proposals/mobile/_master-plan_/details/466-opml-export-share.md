# 466-opml-export-share

**Master step:** 16.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope (shipped)

- **Web:** browser download of the export response.
- **Mobile:** write OPML to cache via `expo-file-system`, then `Share.share` (skipped when
  `EXPO_PUBLIC_MOBILE_E2E=1`).

## Plan archive

`.llm/plans/completed/opml-import-export/` (02–03).

## Verification

```bash
make e2e_test_web_report_spec SPEC=e2e/settings-opml-export.spec.ts
npm run mobile:e2e:test -- opml
```
