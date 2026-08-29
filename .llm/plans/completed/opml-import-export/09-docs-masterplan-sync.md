# 09 — Docs + master-plan sync

**Phase 4.** Run after 01-08 land.

## Scope

Update planning docs and abcmemory to reflect delivered OPML import/export and confirm parity.

## Tasks

1. **Master plan Track 16** in
   [docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md):
   mark the OPML steps done and adjust statuses:
   - 16.4 OPML import parse, 16.5 batch subscribe, 16.6 export generate, 16.7 export share,
     16.8 error handling, 16.9 E2E import, 16.10 E2E export.
   - Note the import moved server-side (async job) vs the original client-parse framing; update the
     step text to match the shipped architecture.
   - Update the "Current status / next up" table (PG-9 rest → OPML done).
2. **Detail files**: touch
   [details/463-opml-import-parse.md](/docs/proposals/mobile/_master-plan_/phase-1/details/463-opml-import-parse.md)
   … `469` to reflect the server-job design (or add a short note pointing at this plan set).
3. **Web docs**: add a short OPML section where settings features are documented (find the settings
   doc under `docs/` or `apps/web`); note server endpoints `GET /account/opml/export`,
   `POST /account/opml/import`, status polling, and the 50/hr limit.
4. **abcmemory** (only if a durable rule/skill is warranted): if OPML import resolution (DB → PI →
   add-by-RSS) or the pending-follow pattern should be enforced going forward, add/extend a rule
   under `.cursor/rules/` (see **abcmemory** skill). Otherwise skip.
5. **Parity confirmation**: verify the [00-SUMMARY.md](./00-SUMMARY.md) parity table — web + mobile
   both have add-by-RSS, OPML import, OPML export.

## Plan completion

Per **plan-completion** skill: when 09 is done (last in the set), move the whole
`.llm/plans/active/opml-import-export/` directory to `.llm/plans/completed/opml-import-export/`.

## Verification (operator)

```bash
npm run lint
```
