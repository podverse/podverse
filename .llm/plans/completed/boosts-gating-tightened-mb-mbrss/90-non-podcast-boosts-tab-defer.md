# Non-Podcast Boosts Tab Deferral Decision

Date: 2026-04-19
Status: Deferred (explicit)
Scope: Add-by-RSS and non-podcast media surfaces (artist, album, track, livestream)

## Decision

Do not enable a public Boosts messages tab for non-podcast surfaces yet.

Boost action availability is now intentionally broader (`mb-v1` and `mbrss-v1` with value-tag recipients), but Boosts tab visibility remains constrained to public message retrieval paths that are currently modeled for podcast and episode scopes.

## Why Deferred

- Current public boost message fetch contracts are podcast/item guided and rely on stable identifiers currently represented by `podcast_guid` and `item.guid`.
- Existing breadcrumb/link resolver behavior for Boost messages is podcast/episode oriented.
- Enabling tabs without stable scope + fetch support would create partial UI where tabs render but cannot reliably query message pages.

## Prerequisites To Enable

1. Define supported public message scopes for each target surface:
   - artist
   - album
   - track
   - livestream
2. Confirm backend/public API query contract for each scope:
   - required identifiers
   - pagination semantics
   - compatibility expectations across `mb-v1` and `mbrss-v1`
3. Add scope-aware breadcrumb resolution and link targets for each surface.
4. Extend `createBoostMessagesPageFetcher` to support the new scopes.
5. Update `getBoostEligibilityForContent` (or sibling policy util) with explicit per-surface tab criteria.
6. Add matrix coverage (manual + automated where available) for:
   - action visible / tab hidden
   - action visible / tab visible
   - post-boost refresh behavior on each supported scope.

## Follow-Up Trigger

Revisit this defer decision as soon as a non-podcast public-message API contract is accepted and implemented.
