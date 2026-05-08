# 02 - Migrate apps/web Callsites And Delete Local Files

## Assessment

`apps/web` currently imports from app-local files at
`apps/web/src/components/LoadingSpinner/`. After `01` lands, all 38 callsites should
switch to the shared component from `@podverse/ui` and the local files can be deleted.

The shared component requires an `ariaLabel` prop, so each callsite must pass a
localized string (e.g. `tMisc('loading')`, or — where the page already has it —
`tMisc('loading_your_content')`). No visual change is expected.

## Prompt

Migrate every web callsite to `@podverse/ui`, then remove the app-local files.

1. Update imports site-by-site (default to named imports from `@podverse/ui`):
   - List page overlays (pass `ariaLabel={tMisc('loading')}`):
     - [apps/web/src/app/HomePageList.tsx](../../../../apps/web/src/app/HomePageList.tsx)
     - [apps/web/src/app/episodes/EpisodesPageList.tsx](../../../../apps/web/src/app/episodes/EpisodesPageList.tsx)
     - [apps/web/src/app/podcasts/PodcastsPageList.tsx](../../../../apps/web/src/app/podcasts/PodcastsPageList.tsx)
     - [apps/web/src/app/podcasts/livestreams/LivestreamsPageList.tsx](../../../../apps/web/src/app/podcasts/livestreams/LivestreamsPageList.tsx)
     - [apps/web/src/app/albums/AlbumsPageList.tsx](../../../../apps/web/src/app/albums/AlbumsPageList.tsx)
     - [apps/web/src/app/tracks/TracksPageList.tsx](../../../../apps/web/src/app/tracks/TracksPageList.tsx)
     - [apps/web/src/app/artists/ArtistsPageList.tsx](../../../../apps/web/src/app/artists/ArtistsPageList.tsx)
     - [apps/web/src/app/profiles/ProfilesPageList.tsx](../../../../apps/web/src/app/profiles/ProfilesPageList.tsx)
     - [apps/web/src/app/playlists/PlaylistsPageList.tsx](../../../../apps/web/src/app/playlists/PlaylistsPageList.tsx)
     - [apps/web/src/app/clips/ClipsPageList.tsx](../../../../apps/web/src/app/clips/ClipsPageList.tsx)
     - [apps/web/src/app/history/HistoryPageList.tsx](../../../../apps/web/src/app/history/HistoryPageList.tsx)
     - [apps/web/src/app/queues/QueuesPageList.tsx](../../../../apps/web/src/app/queues/QueuesPageList.tsx)
     - [apps/web/src/app/search/SearchPageList.tsx](../../../../apps/web/src/app/search/SearchPageList.tsx)
     - [apps/web/src/app/my-profile/MyProfilePageContentList.tsx](../../../../apps/web/src/app/my-profile/MyProfilePageContentList.tsx)
     - [apps/web/src/app/profile/[id_text]/ProfilePageContentList.tsx](../../../../apps/web/src/app/profile/[id_text]/ProfilePageContentList.tsx)
     - [apps/web/src/app/playlist/[playlist_id]/PlaylistPageList.tsx](../../../../apps/web/src/app/playlist/[playlist_id]/PlaylistPageList.tsx)
   - Detail page overlays:
     - [apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx](../../../../apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx)
     - [apps/web/src/app/album/[channel_id]/AlbumPageList.tsx](../../../../apps/web/src/app/album/[channel_id]/AlbumPageList.tsx)
     - [apps/web/src/app/track/[item_id]/TrackPageList.tsx](../../../../apps/web/src/app/track/[item_id]/TrackPageList.tsx)
     - [apps/web/src/app/episode/[item_id]/EpisodePageList.tsx](../../../../apps/web/src/app/episode/[item_id]/EpisodePageList.tsx)
     - [apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageList.tsx](../../../../apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageList.tsx)
   - Add-by-RSS pages (existing `message={tMisc('loading_your_content')}` callers should
     also pass that same value as `ariaLabel`):
     - [apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx](../../../../apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx)
     - [apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx](../../../../apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx)
     - [apps/web/src/app/add-by-rss/livestream/AddByRSSLivestreamItemPageClient.tsx](../../../../apps/web/src/app/add-by-rss/livestream/AddByRSSLivestreamItemPageClient.tsx)
     - [apps/web/src/app/add-by-rss/track/AddByRSSTrackItemPageClient.tsx](../../../../apps/web/src/app/add-by-rss/track/AddByRSSTrackItemPageClient.tsx)
     - [apps/web/src/app/add-by-rss/tracks/AddByRSSTracksPageClient.tsx](../../../../apps/web/src/app/add-by-rss/tracks/AddByRSSTracksPageClient.tsx)
     - [apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageClient.tsx](../../../../apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageClient.tsx)
     - [apps/web/src/app/add-by-rss/artists/AddByRSSArtistsPageClient.tsx](../../../../apps/web/src/app/add-by-rss/artists/AddByRSSArtistsPageClient.tsx)
     - [apps/web/src/components/AddByRSS/Detail/AddByRSSDetailClient.tsx](../../../../apps/web/src/components/AddByRSS/Detail/AddByRSSDetailClient.tsx)
     - [apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx](../../../../apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx)
   - Standalone `LoadingSpinner` (non-overlay):
     - [apps/web/src/app/email-change-verifying/EmailChangeVerifyingPageClient.tsx](../../../../apps/web/src/app/email-change-verifying/EmailChangeVerifyingPageClient.tsx)
     - [apps/web/src/app/verify-email/VerifyEmailPageClient.tsx](../../../../apps/web/src/app/verify-email/VerifyEmailPageClient.tsx)
     - [apps/web/src/components/Image/ImageNonReact.tsx](../../../../apps/web/src/components/Image/ImageNonReact.tsx)
     - [apps/web/src/components/LazyLoadPlaceholder/LazyLoadPlaceholder.tsx](../../../../apps/web/src/components/LazyLoadPlaceholder/LazyLoadPlaceholder.tsx)
     - [apps/web/src/components/Boost/messages/BoostMessagesSection.tsx](../../../../apps/web/src/components/Boost/messages/BoostMessagesSection.tsx)
     - [apps/web/src/components/Boost/BoostRecipientStatusList.tsx](../../../../apps/web/src/components/Boost/BoostRecipientStatusList.tsx)
     - [apps/web/src/components/Form/SwitchButton.tsx](../../../../apps/web/src/components/Form/SwitchButton.tsx)
2. Convert each `import LoadingSpinner from '...'` and
   `import LoadingSpinnerOverlay from '...'` to:
   - `import { LoadingSpinner, LoadingSpinnerOverlay } from '@podverse/ui';` (named).
   - Keep the styles import last per
     [styles-import-last](../../../../.cursor/skills/styles-import-last/SKILL.md).
3. Add an `ariaLabel` prop at every callsite. Use the namespace already in use on the
   page (`useTranslations('misc')`, `tMisc(...)`, etc.). For non-overlay standalone
   spinners that sit alongside descriptive text (e.g. `BoostMessagesSection`,
   `BoostRecipientStatusList`, `SwitchButton`), prefer
   `<LoadingSpinner size="small" decorative />` so the surrounding text remains the
   announced content.
4. Delete the now-unused app-local files:
   - [apps/web/src/components/LoadingSpinner/LoadingSpinner.tsx](../../../../apps/web/src/components/LoadingSpinner/LoadingSpinner.tsx)
   - [apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx](../../../../apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx)
   - [apps/web/src/styles/components/LoadingSpinner/LoadingSpinner.module.scss](../../../../apps/web/src/styles/components/LoadingSpinner/LoadingSpinner.module.scss)
   - [apps/web/src/styles/components/LoadingSpinner/LoadingSpinnerOverlay.module.scss](../../../../apps/web/src/styles/components/LoadingSpinner/LoadingSpinnerOverlay.module.scss)
5. Confirm with `rg` that no `from '.../LoadingSpinner/LoadingSpinner'` or
   `from '.../LoadingSpinner/LoadingSpinnerOverlay'` references remain in `apps/web`.

## Acceptance Criteria

- All `apps/web` callsites import `LoadingSpinner` / `LoadingSpinnerOverlay` from
  `@podverse/ui`.
- Every callsite passes a localized `ariaLabel` (or `decorative`).
- App-local `LoadingSpinner` files and SCSS are deleted.
- No visual or behavioral regressions on web list, detail, search, history, queues,
  add-by-rss, or verify-email flows.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/web
./scripts/nix/with-env npm run type-check -w @podverse/web
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts
```
