# Future Plan: Podcast Index ID — Emit and/or Parser Support

**Status:** Handled by Podcast Index service mock. Kept for reference.

**Prerequisite:** Sub-plan 05 (placeholder docs) completed. Execute when parser/Add-by-RSS behavior is decided and feed-level identifier from RSS is required.

## Objective

Define whether the RSS feed generator should emit `<podcast:id>` (or equivalent) and, if the parser is updated to read a feed-level identifier from RSS, implement generator emission and optionally parser changes.

## Current State

- Parser receives `podcast_index_id` as a **parameter** to `handleGetRSSFeed(url, podcast_index_id)`; it is not read from feed XML.
- Partytime pending phase has `podcast:id`; format and semantics are directory/platform specific.
- Generator currently does not emit `<podcast:id>` to avoid implying parser support.

## Implementation Steps (when needed)

1. **Product/parser decision** — Decide whether feed-level ID should ever be read from RSS (e.g. for Add-by-RSS or directory alignment). If no, keep generator as-is (no emission); this plan is N/A.
2. **Define format** — If yes, define element/attribute (e.g. `<podcast:id>` with platform attribute or text content) and how it maps to internal `podcast_index_id` or a new field. Check Partytime phase-pending for exact tag name and attributes.
3. **Generator** — Add optional emission of the chosen element. Use faker (e.g. numeric string or UUID) or configurable value so tests can assert on it. Document in generator README.
4. **Parser (if applicable)** — If parser should read the value: update feed fetch/handle path to read from parsed feed and pass through or persist. May require parser-mapping or ORM change; scope separately.

## Acceptance Criteria

- Decision documented (emit or not; parser read or not).
- If emitting: generated feeds can include the element with valid test values; Partytime parses it (pending phase).
- If parser reads: feed-level ID from RSS is used as specified (e.g. for lookup or persistence).

## References

- [packages/parser/src/lib/rss/feed/feed.ts](packages/parser/src/lib/rss/feed/feed.ts)
- [partytime/src/parser/phase/phase-pending.ts](partytime/src/parser/phase/phase-pending.ts) (podcast:id)
