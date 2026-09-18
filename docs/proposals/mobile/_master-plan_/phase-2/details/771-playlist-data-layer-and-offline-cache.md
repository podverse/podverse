# 771-playlist-data-layer-and-offline-cache

**Master step:** P2.1.6
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

Introduce a `playlistRepository` and SQLite cache so playlist screens stop calling
`ApiRequestService` / `req*` directly
([`mobile-react-native`](/.cursor/rules/mobile-react-native.mdc),
[`mobile-data-layer`](/.cursor/skills/mobile-data-layer/SKILL.md)). Today
[`LibraryPlaylistsScreen`](apps/mobile/src/screens/library/LibraryPlaylistsScreen.tsx),
[`PlaylistDetailScreen`](apps/mobile/src/screens/library/PlaylistDetailScreen.tsx),
[`PlaylistFormScreen`](apps/mobile/src/screens/library/PlaylistFormScreen.tsx), and
[`useAddToPlaylist`](apps/mobile/src/screens/library/useAddToPlaylist.tsx) all hit the API from the
screen. There is no playlist table; Offline Mode shows the generic unavailable message.

### Schema (migration 17)

Add forward-only migration **17** after the current latest (`16` in
[`migrations.ts`](apps/mobile/src/data/db/migrations.ts)):

| Table               | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `playlist`          | Cached `DTOPlaylist` JSON + ownership / follow flags + list watermarks  |
| `playlist_resource` | Cached `DTOPlaylistResource` rows keyed by playlist + `list_position`   |

Store whole DTOs as `payload_json` the way other entity tables do
([`dto-changes-are-device-data-migrations`](/.cursor/rules/dto-changes-are-device-data-migrations.mdc)).
Use `kv_meta` watermarks for list scopes (`private` / `private_followed` × sort × medium × page) and
per-playlist resource pages.

### Repository surface

`apps/mobile/src/data/repositories/playlistRepository.ts`, exported from the repositories barrel.
Mirror `queueRepository` patterns (auth context argument, error handling, read-through / write-behind):

| Method family                         | API wrappers                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| List owned / followed                 | `reqPlaylistGetMany` (`type: 'private'` \| `'private_followed'`)             |
| Get one / create / edit / delete      | `reqPlaylistGet`, `reqPlaylistCreate`, `reqPlaylistEdit`, `reqPlaylistDelete` |
| Follow / unfollow                     | `reqAccountFollowPlaylist`, `reqAccountUnfollowPlaylist`                     |
| Resources (paginated + private-all)   | `reqPlaylistResourceGetManyByPlaylistIdText`, `…GetAllByPlaylistIdTextPrivate` |
| Add first / last / between / delete   | `reqPlaylistResource*` for item, clip, soundbite, add-by-RSS                 |

Every mutation that changes a list the car can browse must project the native library-browse cache
([`mobile-carplay-android-auto`](/.cursor/rules/mobile-carplay-android-auto.mdc)). Route
[`accountRepository.fetchFollowedPlaylistNodes`](apps/mobile/src/data/repositories/accountRepository.ts)
through this repository instead of calling `reqPlaylistGetMany` itself.

### Offline Mode

Reads come from SQLite when the toggle is on (or the network is unreachable) so a signed-in user
still sees cached owned and followed playlists. **Writes are refused** with the existing offline
unavailable path — there is no playlist mutation outbox in this set. Document that limitation in the
repository module comment (future-forward: what the code guarantees today, not a plan cite).

### Row mapper fix (folded here)

[`playlistResourceToHomeRow`](apps/mobile/src/lib/rows/homeRowMappers.ts) returns `null` for
add-by-RSS resources, so those rows silently vanish from playlist detail. Widen it the same way
queue step 01 widens `queueResourceToHomeRow`: dispatch on resource type, render from
`add_by_rss_resource_data`, and use `features.add_by_rss.private_item_placeholder` when
`is_add_by_rss_redacted`. Unit-test per resource type
([`unit-test-design-no-overgranularity`](/.cursor/skills/unit-test-design-no-overgranularity/SKILL.md)).

## Acceptance criteria

- Migration 17 creates `playlist` and `playlist_resource`; `LATEST_MIGRATION_VERSION` is 17.
- Screens and `useAddToPlaylist` read and write through `playlistRepository` only.
- Followed-playlist car browse hydration uses the repository.
- Offline Mode can list cached playlists; a write while Offline Mode is on surfaces the unavailable
  message and does not call the network.
- Add-by-RSS and redacted add-by-RSS playlist resources map to rows instead of being dropped.

## Web parity references

- [`packages/helpers-requests/src/api/playlist/playlist.ts`](packages/helpers-requests/src/api/playlist/playlist.ts)
  — list / CRUD dispatch
- [`packages/helpers-requests/src/api/playlist/playlistResource/`](packages/helpers-requests/src/api/playlist/)
  — resource add / delete / between
- [`ListPlaylistResourceRow`](apps/web/src/components/List/Playlists/ListPlaylistResourceRow.tsx) —
  resource type dispatch and add-by-RSS redaction

## Verification

```bash
# Mobile (unit) — Mobile tab
npm --prefix apps/mobile run test -- src/lib/rows/homeRowMappers.test.ts
npm --prefix apps/mobile run test -- src/data/repositories/playlistRepository.test.ts
```
