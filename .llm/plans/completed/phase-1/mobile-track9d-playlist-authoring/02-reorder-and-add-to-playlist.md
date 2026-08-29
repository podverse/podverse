# 02 — Reorder + add-to-playlist (9d.3, 9d.4)

**Cursor model:** Codex 5.3  
**Details:** 592, 593  
**Ship bar:** Functional reorder (up/down preferred) + more-sheet picker sketch — not pixel DnD.

## Goal

1. Owner can reorder playlist resources and persist order.  
2. Media-row more sheet “Add to playlist” opens a playlist picker and adds the item via playlist
   resource APIs.

## Context (read first)

- Details 592, 593
- Inventory: `docs/proposals/mobile/_master-plan_/phase-1/details/497-media-row-actions-inventory.md`
  (add-to-playlist ❌ → wire)
- `apps/mobile/src/components/player/MediaRowActions.tsx` (`onAddToPlaylist`)
- `PlaylistDetailScreen.tsx` + `playlistResourceToHomeRow`
- Web reorder: `apps/web/src/components/List/Playlists/ListPlaylistResources.tsx` (`*AddBetween`)
- APIs: `reqPlaylistResourceItemAddLast` / `AddBetween` / clip / soundbite variants under
  `packages/helpers-requests/src/api/playlist/playlistResource/`
- Call sites that render `MediaRowActions` / `HomeFeedRow` — wire `onAddToPlaylist` where item
  kinds support it (episode/clip/track; skip if kind unsupported — document)

## Tasks

### 9d.3 Reorder

1. On playlist detail (owner), add **Move up** / **Move down** (or equivalent) per row with
   `testID`s — **not** fancy DnD handles (21.12).
2. Persist via the same between/first/last pattern as web (`list_position` neighbors).
3. Reload or optimistic update so order survives refresh.

### 9d.4 Add to playlist

1. Shared sketch component: playlist picker modal/sheet (list private playlists + confirm).
2. Wire `onAddToPlaylist` from media rows (Home / episode lists / etc. that already use
   `MediaRowActions`) to open picker → `*AddLast` (or web-default position).
3. Correct i18n key `features.playlist.add_to_playlist`; success/error sketched in UI.
4. Mark **9d.3, 9d.4** `done` in master plan + Appendix C + detail headers.

## Out of scope

- Pixel drag-and-drop, haptics, spring animations
- Add-to-liked / full playlist membership matrix beyond add-item sketch

## Acceptance

- Owner reorders and order persists after reload
- More sheet add-to-playlist adds an item visible on that playlist’s detail
- Errors visible (no silent catch)
