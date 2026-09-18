# 772-library-playlists-list

**Master step:** P2.1.6
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

Rebuild [`LibraryPlaylistsScreen`](apps/mobile/src/screens/library/LibraryPlaylistsScreen.tsx) as the
owned-and-followed playlist hub for My Library. Today it loads only `type: 'private'`,
`sort: 'recent'`, `medium: 'all'`, page 1, and renders rows with `.map()` inside a `Card` —
that violates [`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc).

### Two chips, not three tabs

`OptionChipGroup` with:

| Chip          | `reqPlaylistGetMany` type   | Label key                      |
| ------------- | --------------------------- | ------------------------------ |
| My playlists  | `'private'`                 | `features.playlist.my_playlists` |
| Followed      | `'private_followed'`        | `filters.type.subscribed`      |

Public / global discovery stays on **Browse → playlists** (`type: 'public'`). No combined endpoint
and no Home chip — deliberate divergence from web's three-tab `/playlists` page, recorded in the
plan set summary.

### Sort and range

Match web's private / followed dropdowns
([`PlaylistsPageDropdownConfig`](apps/web/src/app/playlists/PlaylistsPageDropdownConfig.ts)):

- Sorts: recent (default), oldest, A-Z, top
- Range picker only when sort is top (week / month / day / all-time)

Persist chip, sort, and range per the library-playlists screen instance
([`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)). Free-text filters and page
number do not persist.

### List mechanics

`FillList` over `FlatList` keyed on `playlist.id_text`. Chip row + sort control in
`ListHeaderComponent`; Create button for authenticated users with membership. Pagination loads the
next page through `playlistRepository`. Show creator on Followed rows (web's `showCreator` rule).

### States and tiers

| State                    | Presentation                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| Loading                  | Spinner; never empty while in flight                                 |
| Signed out               | `AuthAwareLoadState` / `CallToActionSection` with login              |
| Signed in, cached empty  | `ListEmpty` with `instructions.no_playlists_created` (My) or empty followed copy |
| Load failed              | `ListError` with retry                                               |
| Offline Mode, no cache   | Existing offline unavailable message                                 |

**Account-tier** to view My / Followed lists. **Membership-tier** to create — gate Create with
`useMembershipGate().openGate` on press, not a persistent card above the list
([`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)).

Browse playlists (`browseFeedData` public top + range) stays as it is; this detail does not change
Browse.

## Acceptance criteria

- My / Followed chips switch list sources; selection and sort/range are remembered.
- The list is a virtualized `FlatList` with pagination; no `.map()` of user playlists.
- Create is membership-gated on press; viewing lists works for any signed-in account.
- Followed rows show the creator when the profile is present.
- Reads go through `playlistRepository` (detail [771](771-playlist-data-layer-and-offline-cache.md)).

## Web parity references

- [`PlaylistsPageListHeader`](apps/web/src/app/playlists/PlaylistsPageListHeader.tsx) — type tabs,
  sort / range, medium (medium filter deferred — [778](778-defer-playlist-medium-and-public-sort.md))
- [`PlaylistsPageDropdownConfig`](apps/web/src/app/playlists/PlaylistsPageDropdownConfig.ts)
- [`ListPlaylists`](apps/web/src/components/List/Playlists/ListPlaylists.tsx) / `ListPlaylistRow`

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
