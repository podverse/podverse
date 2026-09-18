# 777-defer-liked-playlist-and-row-likes

**Master step:** P2.3 (operational backlog)
**Model (author + implement):** Codex 5.3
**Status:** deferred

## Scope

Web's **Liked** playlists (`is_default_likes`) and per-row like toggles
(`features.playlist.add_to_liked` / `remove_from_liked`) via
`reqPlaylistToggleLike` / `reqPlaylistLikesMembership`. Catalog keys already exist; mobile has no
UI.

Deferred out of P2.1.6 because likes are a cross-cutting row-menu feature (Home, podcast, episode,
player, clips) rather than playlist-screen parity. Shipping them inside the playlists set would
touch every media-row More menu and the likes batch hooks without a clear screen boundary.

### When picked up

- Surface the default likes playlist(s) in My Library (or a dedicated entry) per medium
- Add like / unlike to `MediaRowActions` / full player with membership gating
- Reuse web's batch membership hooks pattern (`useLikesItemBatch`, clip / add-by-RSS peers) through
  `playlistRepository` rather than screen-local `req*`
- Decide whether likes participate in Offline Mode cache (likely yes, read-only while offline)

## Acceptance criteria (when picked up)

- User can add / remove item, clip, and add-by-RSS from Liked from row menus and the player.
- Liked playlists are reachable from Library and play like any other playlist.
- Membership rejections open the gate; offline reads use cache when present.

## Web parity references

- [`useLikesItemBatch`](apps/web/src/hooks/useLikesItemBatch.ts) and clip / add-by-RSS peers
- [`PlaylistsFavorites`](apps/web/src/contexts/PlaylistsFavorites.tsx)
- `reqPlaylistToggleLike` / `reqPlaylistGetAllLikesPrivate` in helpers-requests

## Verification

```bash
# Mobile Maestro — when implemented
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
