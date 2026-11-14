# 07 — Docs and close the set

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

## Rows

All rows: confirm each has landed, or is recorded as not built.

## Runs after

01–06.

## Files

- `docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md` (§ Plan sets: say what
  landed; keep the spike bullets as the operator wrote them)
- `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md` (§ Legacy podcast
  lookup: name the route `POST /legacy/podcast/lookup` and the command `v4WriteLegacyPodcastMap`)
- the migration runbook that lists the v4 worker commands in run order (find it with
  `rg -ln "v4SeedStageCatalog|v4_seed_stage_catalog" docs`): add `v4WriteLegacyPodcastMap` before
  go-live, with `-dryRun` first
- `release-notes/scratchpad.md` (only to add an entry an earlier prompt reported but did not
  write)
- `.llm/plans/active/v4-signed-out-carryover/**` → `.llm/plans/completed/v4-signed-out-carryover/`
  (01–03 are already there; move the remaining files into that directory, do not nest a second one)

## Steps

1. Update the docs above to describe the finished behavior (**comments-future-forward** applies
   to docs too: no plan numbers).
2. Check the scratchpad has one entry from each prompt that built something.
3. Follow **plan-completion**: move the remaining active files into
   `.llm/plans/completed/v4-signed-out-carryover/`. That directory already holds 01–03. Do not
   nest a second directory inside it.
4. End with `00-EXECUTION-ORDER.md` § Cumulative verification exactly as written, with its tab
   labels. Leave out the mobile lines for any prompt that recorded "not built".

## Tests

None.

## Release scratchpad

None for this prompt.
