# 773-playlist-detail-parity

**Master step:** P2.1.6
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

Bring [`PlaylistDetailScreen`](apps/mobile/src/screens/library/PlaylistDetailScreen.tsx) to web
detail parity for **viewing and playback**. Owner reorder / remove is
[774](774-playlist-edit-items-reorder-and-remove.md); form delete is
[775](775-playlist-form-parity-and-delete.md).

Today the screen shows title, item count, creator, Share, and Edit (owner), loads **all** resources
via `reqPlaylistResourceGetAllByPlaylistIdTextPrivate`, uses a separate Play button on
`HomeFeedRow`, and leaves row `onPress` as `() => {}`. Offline Mode shows unavailable even when a
cache exists after [771](771-playlist-data-layer-and-offline-cache.md).

### Header

Mirror [`PlaylistPageHeaderInfo`](apps/web/src/app/playlist/[playlist_id]/PlaylistPageHeaderInfo.tsx):

- Title, description (when present), item count, last updated, medium label, creator display name
- Share (existing `buildPublicShareUrl('playlist', …)`)
- **Owner:** Edit metadata → `PlaylistEdit`; Edit items toggle lands in 774
- **Non-owner, signed in:** Follow / Unfollow via `playlistRepository` →
  `reqAccountFollowPlaylist` / `reqAccountUnfollowPlaylist`, matching web's `SubscribeButton`
  `kind="playlist"`

Follow is **membership-tier**; open the gate on press when membership is missing.

### Resource list (view mode)

- Paginated resources through `playlistRepository` (`reqPlaylistResourceGetManyByPlaylistIdText`),
  not private-all
- `FillList` / `FlatList` with `HomeFeedRow` (or equivalent) after
  `playlistResourceToHomeRow` (add-by-RSS included from 771)
- **Row tap plays** and seeds the playlist auto-queue
  (`playPlaylistRowById` / web's `createPlayHandler` + `newAutoQueueConfig.playlist_id_text`),
  clearing prior auto-queue the way web does (`autoQueueShouldClear`)
- Per-item share from the row More menu when the resource supports it (web
  `openPlaylistItemShareModal`)

No reorder and no remove in view mode — those stay behind the owner edit-items mode (774).

### States

Loading / empty / error through `AuthAwareLoadState`. Public playlists reachable from Browse must
load for signed-out users when the playlist is public (web SEO detail path); private playlists for
non-owners stay gated. Offline Mode serves the cached playlist + resources when present.

## Acceptance criteria

- Header shows description, last updated, medium, item count, and creator when available.
- Non-owners can follow / unfollow when membership allows; owners see Edit, not Follow.
- View mode paginates resources; row tap plays and seeds playlist auto-queue.
- Clip, soundbite, and add-by-RSS rows render and play.
- All data access goes through `playlistRepository`.

## Web parity references

- [`PlaylistPageClient`](apps/web/src/app/playlist/[playlist_id]/PlaylistPageClient.tsx) /
  [`PlaylistPageHeader`](apps/web/src/app/playlist/[playlist_id]/PlaylistPageHeader.tsx)
- [`ListPlaylistResources`](apps/web/src/components/List/Playlists/ListPlaylistResources.tsx) —
  `createPlayHandler`, auto-queue config (view branch, not edit)
- [`SubscribeButton`](apps/web/src/components/Media/Header/SubscribeButton.tsx) — playlist follow

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
