# Surface Contract Notes (Phase 01)

Date: 2026-04-19
Phase: `01-surface-inventory-and-type-contracts`

## Added `boosts` To Route Type Contracts

- Artist detail route type values now include `boosts`.
- Album detail route type values now include `boosts`.
- Track detail route type values now include `boosts`.
- Livestream detail route type values now include `boosts`.

This only updates contract-level type/value support; UI tab wiring and fetcher rendering are handled in later phases.

## Required IDs Per Surface For Boost Messages Scope

- Artist/Album: channel-scoped messages require stable channel-level identifiers (`podcast_guid` expected for current mbrss scope).
- Track/Livestream: item-scoped messages require `item.guid` (and associated channel metadata for link resolution).

## Videos Surface Decision (Current)

- `apps/web/src/app/videos/page.tsx` is currently a placeholder (`Coming Soon`) and has no detail tab or Boost messages list surface.
- No videos-specific Boosts tab work is required in this phase.
- If a real videos detail/list experience is added later, add an explicit scoped contract and tab/fetcher integration in a follow-up plan.
