# 465-opml-export-generate

**Master step:** 16.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope (shipped)

- Server `GET /account/opml/export` builds OPML from directory follows + add-by-RSS follows
  (`generateOpml` + `reqAccountOpmlExport`).

## Plan archive

`.llm/plans/completed/opml-import-export/` (01–03).

## Verification

```bash
npm run test:e2e:api
```
