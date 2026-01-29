# QueryParams Migration Summary

## Complete Scope

**39 files total** import QueryParams types from `@podverse/helpers`

### Breakdown

**11 files** are CORRECT (import only Medium/QueueMedium which stay in helpers):

- No changes needed ✅

**28 files** need MIGRATION (import types that moved to helpers-requests):

- Must split imports ⚠️

## Files Requiring Migration (28)

### Critical Priority (Blocking Build)

1. `apps/web/src/app/album/[channel_id]/AlbumClient.tsx` 🚨

### High Priority (Page Components - 13 files)

2. `apps/web/src/app/HomeHeader.tsx`
3. `apps/web/src/app/profiles/ProfilesContext.tsx`
4. `apps/web/src/app/podcast/[channel_id]/PodcastDropdownConfig.ts`
5. `apps/web/src/app/podcast/[channel_id]/PodcastClient.tsx`
6. `apps/web/src/app/podcast/[channel_id]/PodcastContext.tsx`
7. `apps/web/src/app/podcast/livestream/[item_id]/LivestreamClient.tsx`
8. `apps/web/src/app/queues/QueuesPageContext.tsx`
9. `apps/web/src/app/history/HistoryPageContext.tsx`
10. `apps/web/src/app/podcasts/PodcastsContext.tsx`
11. `apps/web/src/app/podcasts/livestreams/LivestreamsContext.tsx`
12. `apps/web/src/app/episodes/EpisodesContext.tsx`
13. `apps/web/src/app/episode/[item_id]/EpisodeContext.tsx`
14. `apps/web/src/app/clips/ClipsContext.tsx`

### Medium Priority (Music & Playlist - 6 files)

15. `apps/web/src/app/playlist/[playlist_id]/PlaylistContext.tsx`
16. `apps/web/src/app/album/[channel_id]/AlbumDropdownConfig.ts`
17. `apps/web/src/app/artist/[channel_id]/ArtistClient.tsx`
18. `apps/web/src/app/artist/[channel_id]/ArtistListHeader.tsx`
19. `apps/web/src/app/track/[item_id]/TrackContext.tsx` (if exists)
20. `apps/web/src/app/tracks/TracksContext.tsx` (if exists)

### Lower Priority (Components - 5 files)

21. `apps/web/src/components/Modal/ModalPlaylistAddTo.tsx`
22. `apps/web/src/components/List/Queues/ListQueueResources.tsx`
23. `apps/web/src/components/List/ItemSoundbites/ListItemSoundbites.tsx`
24. `apps/web/src/components/List/Clips/ListClips.tsx`
25. `apps/web/src/components/List/Playlists/ListPlaylists.tsx` (if exists)

### Utility Files (3 files)

26. `apps/web/src/utils/categories.ts`
27. `apps/web/src/utils/localSettings/localSettings.ts` (imports 7 types!)
28. Additional utility files (TBD)

## Files Already Correct (11)

These import ONLY `QueryParamsMedium` or `QueryParamsQueueMedium` (which stay in helpers):

1. `apps/web/src/app/playlists/PlaylistsDropdownConfig.ts`
2. `apps/web/src/app/podcasts/page.tsx`
3. `apps/web/src/app/albums/page.tsx`
4. `apps/web/src/app/artists/page.tsx`
5. `apps/web/src/app/episodes/page.tsx`
6. `apps/web/src/app/clips/page.tsx`
7. `apps/web/src/app/playlists/page.tsx`
8. `apps/web/src/app/tracks/page.tsx`
9. `apps/web/src/app/music/livestreams/page.tsx`
10. `apps/web/src/app/HomeDropdownConfig.tsx`
11. `apps/web/src/components/Media/Livestream/LivestreamHeader.tsx`

Plus 4 ListCombinedChannels components (already verified).

## Migration Strategy

### Phase 1: Critical (1 file)

Fix `AlbumClient.tsx` to unblock bundle analyzer

### Phase 2: Page Components (13 files)

Can execute in parallel - group by feature:

- Podcast pages (3 files)
- Episodes/Clips pages (3 files)
- Queues/History (2 files)
- Contexts (5 files)

### Phase 3: Music & Playlists (6 files)

Can execute in parallel

### Phase 4: Components & Utils (8 files)

Can execute in parallel

## Execution Plan Files

- `migration-06-album-client-CRITICAL.md` - Phase 1 (1 file)
- `migration-08-podcast-pages.md` - Phase 2a (3 files)
- `migration-09-episodes-clips.md` - Phase 2b (3 files)
- `migration-10-queues-history.md` - Phase 2c (2 files)
- `migration-11-contexts.md` - Phase 2d (5 files)
- `migration-12-music-playlists.md` - Phase 3 (6 files)
- `migration-13-components-utils.md` - Phase 4 (8 files)

## Total Effort

- Files to update: 28
- Estimated time: 45-60 minutes
- Parallelization: High (phases 2-4 can run concurrently)
- Risk: Low (TypeScript provides safety net)
