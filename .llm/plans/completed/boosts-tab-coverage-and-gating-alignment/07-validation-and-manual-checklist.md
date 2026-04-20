# 07 Validation And Manual Checklist

## Lint Validation
Run from monorepo root:

```bash
npm run lint -w @podverse/web -- --max-warnings 0
```

If unrelated workspace issues block full lint, run targeted lint on touched files:

```bash
npx eslint "apps/web/src/utils/value/boostEligibility.ts" "apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx" "apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx" "apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx" "apps/web/src/app/episode/[item_id]/EpisodePageList.tsx" "apps/web/src/components/Media/Header/HeaderButtons.tsx" "apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx" "apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx" "apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx" --max-warnings 0
```

## Manual Verification Checklist
1. **Podcast page with eligible MetaBoost**
   - Boosts tab appears.
   - Boost action button appears.
   - Sending boost refreshes Boosts list.
2. **Episode page with eligible MetaBoost**
   - Boosts tab appears.
   - Boost action button appears.
   - Sending boost refreshes Boosts list.
3. **Podcast/Episode without eligible metadata**
   - Boosts tab hidden.
   - Boost action hidden.
4. **Add-by-RSS podcast/artist/album**
   - Boost button visibility aligns with shared eligibility.
5. **Non-podcast surfaces (artist/album/track/livestream)**
   - No accidental Boosts-tab exposure.
   - Existing non-boost tabs continue to function.

## Regression Watch Items
- Refresh trigger still only affects supported Boosts tab pages.
- No breakage in share/funding/subscribe header controls.
- No mismatch where tab is shown but fetcher cannot be built.
