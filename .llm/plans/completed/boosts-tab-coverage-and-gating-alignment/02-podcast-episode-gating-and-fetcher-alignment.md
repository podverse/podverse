# 02 Podcast Episode Gating And Fetcher Alignment

## Objective
Make podcast/episode Boosts-tab gating and fetcher eligibility use the same shared decision utility.

## Files In Scope
- `apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx`
- `apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodePageList.tsx`

## Tasks
1. Replace ad hoc `ssrCanShowBoosts` logic in page clients with `getBoostEligibilityForContent`.
2. In page list components, gate `boostsPageFetcher` creation with the same shared eligibility outcome.
3. Preserve existing scope wiring:
   - Podcast scope: `{ type: 'channel', podcastGuid }`
   - Episode scope: `{ type: 'item', itemGuid }`
4. Preserve existing refresh trigger behavior on supported pages.

## DRY Guidelines
- Avoid route-local inline checks like `standard === 'mbrss-v1' && Boolean(...)` once utility is integrated.
- Keep any remaining checks strictly data-fetcher-specific (null guard for IDs already implied by eligibility should be minimized).

## Acceptance Criteria
- Podcast and episode pages show Boosts tab only via shared utility output.
- Messages fetcher is not constructed when shared utility says tab unsupported.
- Existing Boosts tab refresh behavior remains unchanged.
