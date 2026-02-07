# Sub-Plan 5: Podcast Index ID Placeholder

## Objective

Document that `podcast_index_id` is not currently derived from RSS in the Podverse parser, and reserve a placeholder for `<podcast:id>` (or equivalent) handling in a future sub-plan when parser/Add-by-RSS alignment is decided.

## Current Behavior (Parser)

- **Source:** [packages/parser/src/lib/rss/feed/feed.ts](packages/parser/src/lib/rss/feed/feed.ts) — `handleGetRSSFeed(url, podcast_index_id)` takes `podcast_index_id` as a parameter; it is not read from the feed XML.
- **Usage:** [packages/parser/src/lib/rss/parser.ts](packages/parser/src/lib/rss/parser.ts) — Feeds are fetched and parsed with a `podcast_index_id` provided by the caller (e.g. from Podcast Index API or database). "Add by RSS" flows do not use Podcast Index ID.
- **Partytime:** The pending phase includes `podcast:id` ([partytime/src/parser/phase/phase-pending.ts](partytime/src/parser/phase/phase-pending.ts)); this is a directory/platform identifier, not necessarily the same as the internal `podcast_index_id` used by Podverse.

## Placeholder Actions

1. **Document in generator** — In `tools/rss-feed-generator/README.md` (or equivalent), add a short section "Podcast Index ID" stating:
   - The Podverse parser does not currently derive `podcast_index_id` from RSS; it is supplied externally.
   - The generator does not emit `<podcast:id>` or any feed-level identifier for Podcast Index in this phase.
   - Future work: see [future/08-podcast-index-id-implementation.md](future/08-podcast-index-id-implementation.md) for when parser/Add-by-RSS behavior is decided.

2. **Code comment** — Where channel-level XML is built, add a comment: "Podcast Index ID: not emitted; parser does not read it from RSS. See future/08-podcast-index-id-implementation.md."

3. **No XML emission** — Do not add `<podcast:id>` to generated feeds for now. This avoids implying parser support that does not exist.

## Acceptance Criteria

- README (or design doc) clearly states that podcast_index_id is out of scope for the current generator and points to this placeholder sub-plan.
- No `<podcast:id>` (or similar) appears in generated feed XML unless a later decision explicitly adds it.

## Run after this plan

From repo root: `npm run generate -w podverse-test-assets -- 2 --items 20 --multi 2`. Or: `cd tools/test-assets && npm run generate -- 2 --items 20 --multi 2`.

Confirm:

1. Feeds generate (2 sets × 6 types = 12 files) under `tools/test-assets/assets/` and parse as before.
2. No `<podcast:id>` in generated XML. TOOLS-TEST-ASSETS.md (or README) documents that podcast_index_id is out of scope and points to future/08.

## Deferred implementation

Full implementation steps are in [future/08-podcast-index-id-implementation.md](future/08-podcast-index-id-implementation.md). Execute that plan when parser/Add-by-RSS behavior is decided.
