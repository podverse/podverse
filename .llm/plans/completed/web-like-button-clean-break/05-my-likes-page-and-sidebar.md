# Plan 05 - My Likes Page And Sidebar

## Goal

Add a dedicated `My Likes` navigation entry and page with separate tabs for episodes, music tracks, and clips.

## Target Files

- `apps/web/src/components/SideBar/SideBar.tsx`
- `apps/web/src/constants/routes.ts`
- `apps/web/src/app/my-likes/page.tsx` (new)
- `apps/web/src/app/my-likes/MyLikesPageClient.tsx` (new)
- `apps/web/src/app/my-likes/MyLikesPageContext.tsx` (new)
- `apps/web/src/app/my-likes/MyLikesPageListHeader.tsx` (new)
- Reusable list components under `apps/web/src/components/List/`

## Steps

1. Add `My Likes` route constant and sidebar link.
2. Implement `My Likes` using the same “big list page” building blocks as `/playlists` (context + list
   header + pagination), but with tab semantics.
3. Add top tabs for:
   - Episodes
   - Music Tracks
   - Clips
4. URL and navigation strategy (pick one, but keep the clean-defaults rule in
   `.cursor/rules/routing-url-params.mdc`):
   - **Recommended default tab = Episodes** with no extra query string noise.
   - **Non-default tabs** may appear as `?tab=music` / `?tab=clips` (and drop the param when returning
     to Episodes), *or* use path segments (equally acceptable) — but avoid `page=1` in the URL.
5. Data source (per earlier decision): use **dedicated, paginated `GET` list endpoints** implemented in
   the API, each backed by the correct `is_default_likes` membership:
   - Episodes tab lists **item** resources from the **AV** default-likes playlist
   - Music tab lists **item** resources from the **music** default-likes playlist
   - Clips tab lists **clip** resources, filtered to clips, sourced from the **AV** default-likes
     playlist
6. Reuse the existing `ListPlaylistResources` / row components (or the closest list components already
   used for playlist details) to render rows once the per-tab `GET` returns a normalized “playlist
   resource” compatible shape.

## Acceptance Criteria

- Sidebar includes a visible `My Likes` entry.
- The page loads and tab-switches among Episodes, Music Tracks, and Clips, each with correct row types.
- Tab list endpoints are server-filtered; the browser does not download “everything” and filter client-only.
- URL param behavior follows clean-default conventions.
