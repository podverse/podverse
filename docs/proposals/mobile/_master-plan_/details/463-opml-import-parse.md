# 463-opml-import-parse

**Master step:** 16.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope (shipped)

- Clients upload OPML text; **server** parses XML via `parseOpml` (not client-side parse).
- Entry points: web Settings OPML tab; mobile More → OPML (`expo-document-picker`).

## Architecture note

Original master-plan framing was client-side XML parse. Delivery uses the async server job in
`.llm/plans/completed/opml-import-export/` (plans 06–08). See [OPML](/docs/features/OPML.md).

## Verification

```bash
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/settings-opml-export.spec.ts
npm run mobile:e2e:test -- opml
```
