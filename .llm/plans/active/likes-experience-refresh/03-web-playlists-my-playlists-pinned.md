# 03 — Playlists > My Playlists

## Scope

- Use a **single** [reqPlaylistGetMany](../../../packages/helpers-requests/src/api/playlist/playlist.ts) request for the My Playlists view after 01; ordering comes from server (`is_default_likes` first for the selected medium).
- **No second request** solely to pin/reorder default-likes rows in the client.
- [PlaylistsPageContext](../../../apps/web/src/app/playlists/PlaylistsPageContext.tsx): keep current flow unless adding a documented defensive client sort for legacy data edge cases.
- [PlaylistsFavorites / PlaylistsLikes](../../../apps/web/src/contexts/PlaylistsFavorites.tsx): optional `reqPlaylistGetAllLikesPrivate({ includeResources: false })` for cache only; **not** required for My Playlists ordering.

## Out of scope

- Reworking My Likes tabs/routes (covered elsewhere).
- Any new sorting UX for non-likes playlists.

## Definition of done (03)

- [ ] My Playlists data path uses one list fetch (no extra pin fetch).
- [ ] Default-likes row order in UI matches server-provided order.
- [ ] No client reorder logic added unless explicitly documented and justified.
