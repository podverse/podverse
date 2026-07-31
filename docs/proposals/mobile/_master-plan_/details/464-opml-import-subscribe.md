# 464-opml-import-subscribe

**Master step:** 16.5
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope (shipped)

- Per-feed server resolution: DB directory-follow → Podcast Index + pending-follow → add-by-RSS.
- Client polls `GET /account/opml/import/status/:request_id` for the Valkey report (totals +
  per-feed outcomes). 50/hr limit on new work only.

## Architecture note

Not a client-side batch of API mutations. See `.llm/plans/completed/opml-import-export/` (05–06)
and [OPML](/docs/features/OPML.md).

## Verification

```bash
npm run test:e2e:api
```
