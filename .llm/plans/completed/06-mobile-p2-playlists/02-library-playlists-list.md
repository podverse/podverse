# 02 — Library playlists list

**Cursor model:** Codex 5.3 · **Reasoning:** high

Decisions 1–4, 10, 11 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[772](/docs/proposals/mobile/_master-plan_/phase-2/details/772-library-playlists-list.md)

Rebuild `LibraryPlaylistsScreen` on `playlistRepository` with My / Followed chips, sort/range, and a
virtualized list.

## Chips and sort

`OptionChipGroup` in `ListHeaderComponent`:

- My playlists → `type: 'private'` (`features.playlist.my_playlists`)
- Followed → `type: 'private_followed'` (`filters.type.subscribed`)

Sort control (recent default, oldest, A–Z, top) with range only when sort is top — same options web
uses on private / followed tabs. Persist chip + sort + range per instance via `src/prefs/`
([`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)).

Use `medium: 'all'` for this set (AV / Music filter deferred in 778).

## List

Replace `.map()` + `Card` rows with `FillList` / `FlatList` keyed on `playlist.id_text`
([`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc)). Row →
`PlaylistDetail`. Show creator on Followed rows. Pagination through the repository. Pull-to-refresh.

Create button: membership-gated on press via `useMembershipGate().openGate` — do not park a
persistent membership card above the list.

## States

| State                         | Chrome                                              |
| ----------------------------- | --------------------------------------------------- |
| Loading                       | Spinner; never empty while in flight                |
| Signed out                    | Login CTA (`authentication.login_required`)         |
| Empty My / empty Followed     | Distinct empty copy                                 |
| Error                         | `ListError` + retry                                 |
| Offline Mode, no cache        | Offline unavailable                                 |
| Offline Mode, cache present   | Show cached list                                    |

Account-tier to view; membership only for Create.

Keep `testID="library-playlists-screen"` and stable create / row / empty / loading / error IDs so
`library-playlists.yaml` still reaches the screen.

## Out of scope

Browse public playlists unchanged. Detail / form / add-to / reorder are later steps.

## Verification (operator)

```bash
# Mobile Maestro — prerequisites: Metro + iOS/Android (+ E2E API if API-backed) already up
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
