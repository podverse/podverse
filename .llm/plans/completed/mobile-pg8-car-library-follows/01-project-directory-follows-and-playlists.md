# 01 — Project directory follows + playlists into car library-browse (12.22)

**Master step:** 12.22
**Detail doc:** [401-car-library-directory-follows](/docs/proposals/mobile/_master-plan_/details/401-car-library-directory-follows.md)
**Model:** Opus 4.8 (data-layer + hydration + soft-fail semantics)
**Depends on:** 9b.8 / 600 — `subscriptionsRepository` (`mobile-unified-subscriptions` set). Land
that first; this step maps its merged list to car nodes.

## Problem

`toLibraryBrowseNodes` in `apps/mobile/src/data/repositories/accountRepository.ts` projects the
car/watch `library-browse` native-cache index from **add-by-RSS follows only**:

```10:20:apps/mobile/src/data/repositories/accountRepository.ts
import { projectLibraryBrowseIndexToNativeCache } from '../nativeCache';
```

Directory subscriptions (`account_following_channels`) and followed playlists
(`account_following_playlists`) are ignored. In `DTOAccount` these carry **only numeric ids**:

- `DTOAccountFollowingChannel` → `{ account_id, channel_id }`
- `DTOAccountFollowingPlaylist` → `{ account_id, playlist_id }`

So the car Library node is empty for directory-only followers, and the head unit omits it and
drops into Downloads (confirmed 12.17 DHU pass).

## Goal

Project the merged subscriptions (directory follows + add-by-RSS, from the shared
`subscriptionsRepository`) **plus** followed playlists into the `library-browse` index so the car
Library node lists a user's subscriptions with the phone app force-stopped.

## Approach (consume the shared repo — do not re-merge here)

Channels come from **`subscriptionsRepository.list()`** (9b.8 / 600), which already merges,
dedupes, sorts, hydrates, and caches directory + add-by-RSS follows. This step maps that list to
car nodes and adds playlist projection. Keep the existing `projectLibraryBrowseForAccount`
soft-fail contract (a hydration failure must never block the account snapshot write).

1. **Channels:** call `subscriptionsRepository.list()` and map each `SubscribedChannel` →
   `NativeCacheBrowseNode { idText, title, kind: 'podcast', artworkUrl: imageUrl ?? null }`.
   `title` is guaranteed non-empty by the repo; no separate add-by-RSS branch is needed (the repo
   already includes add-by-RSS follows).
2. **Playlists:** collect `playlist_id`s from `account.account_following_playlists`, batch fetch via
   the `ApiRequestService` method **`reqPlaylistGetMany`** (see
   `packages/helpers-requests/src/api/_request.ts`; reuse the mobile auth-refresh path, no raw
   `fetch`), and map each → `NativeCacheBrowseNode { idText: playlist.id_text, title,
   kind: 'playlist', artworkUrl: <image or null> }`. `title` required; drop untitled.
3. **Merge:** concat channel nodes + playlist nodes, dedupe by `idText`, and pass to
   `projectLibraryBrowseIndexToNativeCache({ nodes })`.
4. **Soft-fail:** wrap the playlist hydration in try/catch, log via the existing mobile logging
   path, and still project the channel nodes if playlist hydration fails. If
   `subscriptionsRepository.list()` itself is empty/unavailable, project whatever is available
   (empty cache still omits Library without crashing).

## Structure / DRY

- Keep pure mapping functions small and testable: `mapSubscribedChannelToNode`, `mapPlaylistToNode`,
  and a `mergeLibraryBrowseNodes(...)` combiner. **Do not** re-implement channel merge/hydration —
  that is the shared `subscriptionsRepository` (600).
- If mapping grows beyond a couple of helpers, extract to a sibling module
  (e.g. `apps/mobile/src/data/repositories/libraryBrowseProjection.ts`) and keep
  `accountRepository` orchestration thin. Follow **mobile-react-native** reusable-first guidance.
- Do **not** read SQLite in the native browse path. Projection stays on the JS write side; native
  only reads the cache (unchanged 12.12 contract).

## Files

- `apps/mobile/src/data/repositories/accountRepository.ts` — extend/refactor
  `toLibraryBrowseNodes` + `projectLibraryBrowseForAccount`.
- Possibly new `apps/mobile/src/data/repositories/libraryBrowseProjection.ts` (mappers + merge).
- Unit test alongside (e.g. `libraryBrowseProjection.test.ts`) — the mobile data layer already has
  Vitest-style tests; match the existing repository test pattern.

## Verify first

- Read `apps/mobile/src/data/repositories/subscriptionsRepository.ts` (from 9b.8 / 600) for the
  exact `SubscribedChannel` shape and `list()` signature before mapping.
- Confirm the `reqPlaylistGetMany` argument/return shapes (ids array vs filter object; DTO fields
  for `id_text`, `title`, image) in `packages/helpers-requests/src/api/_request.ts` and the playlist
  request module. Use field names exactly as the DTOs define them (no `as` casts — narrow/guard per
  **avoid-type-assertions**).

## Acceptance criteria

- Following a directory channel (via search/add or the subscribe toggle) → a **Library** node
  appears in the Android Auto / DHU tree with the phone app force-stopped.
- Followed playlists appear under Library (playlist-kind nodes).
- Add-by-RSS follows continue to appear (no regression).
- Empty cache still omits the Library node without crashing (tolerant parse unchanged).
- Hydration failure degrades gracefully (add-by-RSS still projects; no thrown error from
  `saveSnapshot`).
- Unit test covers mapping the shared channel list + playlist nodes, merge/dedupe by `idText`, and
  title-required drop. (Channel merge/hydration itself is tested in 9b.8 / 600.)

## i18n / ship bar

- No new user-facing screen copy in this step (native car titles come from channel/playlist data).
  If any placeholder/empty label is added on the phone side, route it through `t()`
  (**i18n-user-facing-strings**). Ship a functional projection — no pixel polish (Track 23).

## Operator verification (end of step)

Provide these; do not run them yourself. Metro must already be up in **Mobile Metro**.

```bash
# Mobile — regenerate native project if any native/config changed (usually not needed here)
scripts/nix/with-env npm run mobile:prebuild

# Mobile Android — install dev build, then DHU browse with app force-stopped
npm run mobile:android -- --device Pixel_6_Pro_API_33
# Follow a directory channel in-app, then:
adb shell am force-stop com.podverse.app.next
# Launch Desktop Head Unit and confirm the Library node lists the followed channel + playlists
# (see ANDROID-AUTO-DHU-CHECKLIST.md)

# Mobile — scoped unit test for the projection mappers (mobile is a standalone install,
# outside the root workspace — use --prefix, not -w)
npm --prefix apps/mobile run test -- libraryBrowseProjection
```
