# Plan 03 - Web Like Button Rollout

## Goal

Add a reusable thumbs-up like button and wire it across likeable list rows and detail headers with correct auth and filled-state behavior.

## Target Files

- `apps/web/src/contexts/PlaylistsFavorites.tsx` (rename/refactor to likes context)
- `apps/web/src/contexts/Modals.tsx`
- `apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx`
- `apps/web/src/components/List/Music/Albums/Tracks/ListTrackRow.tsx`
- `apps/web/src/components/List/Clips/ListClipRow.tsx`
- `apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeHeaderPlaySection.tsx`
- `apps/web/src/components/Media/Clip/ClipHeaderPlaySection.tsx`
- `apps/web/src/components/AddByRSS/**` (Add-by-RSS has parallel rows/headers; likes must stay in parity
  with non-add-by-RSS surfaces for the same entity types)
- Additional row/detail components that currently place `more` actions

## Steps

1. Introduce a reusable `LikeButton` component with:
   - thumbs-up icon
   - outlined vs filled state
   - loading state during toggle request
   - accessible label text
2. Rename the disabled/stub `PlaylistsFavorites` provider into a first-class `PlaylistsLikes` (name TBD
   but must be likes-only) and wire it at the app root next to the other global providers.
3. Hydration strategy for filled/unfilled on big tables:
   - after list rows are known (or using SSR row ids if available), call the **`POST` batch membership**
     endpoint with capped batches (never `GET` huge id lists in the query string)
   - merge results into a client-side set/map for O(1) per-row render decisions
4. On toggle:
   - call the dedicated **server-side toggle** endpoint
   - optimistically update local like membership state, rollback on failure, and re-sync on success
5. Resource mapping rules the UI must get right (matches API plan):
   - `Item` likes use AV vs music medium mapping
   - `Clip` likes use AV default-likes membership (even if the clip is shown in a “clips” view)
   - add-by-rss likes use the same add-by-rss resource identity the playlist system already uses
6. Place `LikeButton` immediately left of each row/detail `more` menu trigger for likeable entities.
7. Hook each placement to the likes toggle path for the correct resource type (per mapping rules above).
8. For logged-out clicks, open login-required modal flow instead of attempting toggle request.

## Acceptance Criteria

- Likeable rows/details show correct initial filled state when logged in.
- Clicking toggles between liked/unliked with immediate visible feedback.
- Logged-out clicks always trigger login-required modal.
- Livestream surfaces do not render like buttons.
- Add-by-RSS surfaces that are otherwise likeable (items) do not miss like buttons compared to
  their canonical counterparts.
