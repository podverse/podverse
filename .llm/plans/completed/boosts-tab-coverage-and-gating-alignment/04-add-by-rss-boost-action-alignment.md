# 04 Add By RSS Boost Action Alignment

## Objective
Align add-by-RSS boost button visibility with the same shared eligibility utility used elsewhere.

## Files In Scope
- `apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx`

## Tasks
1. Reuse `buildAddByRssBoostChannel(feed)` output as input to eligibility utility.
2. Replace local `hasValue` boost-button render checks with `canShowBoostAction`.
3. Keep existing click behavior and placeholder fallback unchanged when boost channel cannot be built.

## DRY Guidelines
- Avoid per-header reimplementation of value/metaBoost checks.
- If repeated local setup code emerges, consider a tiny shared helper for add-by-RSS boost eligibility input mapping.

## Acceptance Criteria
- Add-by-RSS boost button visibility follows shared eligibility policy.
- Existing subscribe/funding/rss/website behavior is unchanged.
