# 783-playlist-and-user-directory-rows

**Master step:** P2.1.1 follow-up / P2.1.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Playlist and user catalog rows on mobile must match web: text only, no artwork slot. Neither
`DTOPlaylist` nor `DTOAccount` has an image. Browse was rendering both through `HomeFeedRow`,
which always paints a 60px `CoverImage` and showed the `media.image` placeholder.

Shared rows cover Browse Playlists, Browse Users, Library playlists, and Profile playlists. The
Add-to-playlist sheet stays title-only ([776](776-add-to-playlist-sheet-parity.md)).

## Locked decisions

- **Playlist:** title; `features.playlist.item_count`; optional ` – {description}` on the same
  clamped line; creator on a third line when the list is public or followed
  (`account.account_profile.display_name` or `misc.anonymous`).
- **User:** display name (or `misc.anonymous`); optional bio, two-line clamp.
- `showCreator` is true on Browse Playlists (`type: 'public'`) and Library Followed
  (`private_followed`). False on Library My playlists and Profile playlist tabs.
- No last-updated, medium, or privacy on the row. Search does not list playlists or users.
- Playlists and users stay list-only on Browse.
- Playlist detail pushes on the **current** stack (Browse, Library, or More).

## Public top lists

Browse Playlists and Users request `sort: 'top'`. Those endpoints are stats-backed.
`make mobile_e2e_seed` does not write `stats_aggregated_playlist` / `stats_aggregated_account`,
so those directory lists may be empty. Maestro proves the text-only chrome on Browse (no
`home-feed-row` artwork) and proves row copy on Library (created playlist) and My Profile
(seeded embed playlist `e2eEmbPlList01`).

## Acceptance criteria

- Browse Playlists / Users never render `HomeFeedRow` artwork.
- Library Followed names the owner (or Anonymous); My playlists do not.
- Profile playlist rows navigate to PlaylistDetail on the same tab stack.
- Copy helpers join item count and description with an en dash and omit a blank description.

## Web parity references

- [`ListPlaylistRow`](/apps/web/src/components/List/Playlists/ListPlaylistRow.tsx)
- [`ListProfileRow`](/apps/web/src/components/List/Profiles/ListProfileRow.tsx)
- [`PlaylistsPageList`](/apps/web/src/app/playlists/PlaylistsPageList.tsx) (`showCreator` when
  type is `public` or `private_followed`)

## Verification

```bash
# Mobile
npm --prefix apps/mobile run test -- src/lib/rows/catalogRowCopy.test.ts

# Mobile Maestro (E2E Metro + E2E iOS/Android + E2E API already up)
npm run mobile:e2e:test -- browse
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
