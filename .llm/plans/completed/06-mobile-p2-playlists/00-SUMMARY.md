# Phase 2 — Playlists (P2.1.6)

Execution order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Prompts:
[COPY-PASTA.md](COPY-PASTA.md)

**Nextgen code today:** `apps/mobile/src/screens/library/LibraryPlaylistsScreen.tsx`,
`PlaylistDetailScreen.tsx`, `PlaylistFormScreen.tsx`, `useAddToPlaylist.tsx`

**Web reference:** `apps/web/src/app/playlists/`, `apps/web/src/app/playlist/`,
`apps/web/src/components/List/Playlists/`, `apps/web/src/components/Modal/ModalPlaylistAddTo.tsx`

**Details:** [771 data layer](/docs/proposals/mobile/_master-plan_/phase-2/details/771-playlist-data-layer-and-offline-cache.md)
· [772 list](/docs/proposals/mobile/_master-plan_/phase-2/details/772-library-playlists-list.md)
· [773 detail](/docs/proposals/mobile/_master-plan_/phase-2/details/773-playlist-detail-parity.md)
· [774 edit items](/docs/proposals/mobile/_master-plan_/phase-2/details/774-playlist-edit-items-reorder-and-remove.md)
· [775 form](/docs/proposals/mobile/_master-plan_/phase-2/details/775-playlist-form-parity-and-delete.md)
· [776 add-to](/docs/proposals/mobile/_master-plan_/phase-2/details/776-add-to-playlist-sheet-parity.md)

**Deferred:** [777 likes](/docs/proposals/mobile/_master-plan_/phase-2/details/777-defer-liked-playlist-and-row-likes.md)
· [778 medium / public sort](/docs/proposals/mobile/_master-plan_/phase-2/details/778-defer-playlist-medium-and-public-sort.md)

## Why this area

P2.1.6 Playlists is `planned` in the Phase 2 master plan. Mobile already has a Phase 1 functional
sketch (list, detail, create/edit form, add-to sheet, Browse public playlists, deep links), but it
diverges from web on tabs, sorting, offline storage, follow, delete, reorder gesture, add position,
and resource-type coverage. Queue (P2.1.5) is finished and supplies the long-press drag prop and
drop resolver this set reuses.

## What exists today, and what it is

| Present                                      | Actually works / gap                                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Library → Playlists list                     | Private only, `sort: recent`, page 1; `.map()` not `FlatList`     |
| Playlist detail                              | Share, Edit, Move up/down reorder; loads private-all always       |
| Row play via Play button                     | Row `onPress` is inert; no follow                                 |
| Create / edit form                           | Medium hardcoded `av`; no delete; hand-rolled sharable chips      |
| `useAddToPlaylist` sheet                     | `*AddLast`, item/clip only, no medium filter, no create shortcut  |
| Browse → playlists                           | Public top + range — keep as public discovery                     |
| `playlistResourceToHomeRow`                  | Drops add-by-RSS resources                                        |
| Car followed-playlist hydration              | Direct `reqPlaylistGetMany` in `accountRepository`                |
| SQLite / repository                          | **None** — Offline Mode always unavailable for playlists          |

E2E: `apps/mobile/e2e/library-playlists.yaml` covers create → detail → edit → back. Reorder and
add-to are commented as manual.

## Locked decisions

The operator's answers, plus why. Do not deviate without asking.

1. **My Library = My playlists + Followed chips.** Two `OptionChipGroup` chips on
   `LibraryPlaylistsScreen` using existing `type: 'private'` and `type: 'private_followed'`
   endpoints. No combined API endpoint.
2. **No Home Playlists chip.** Home stays podcasts / episodes / artists / albums / tracks / clips.
3. **Browse keeps public discovery** (`type: 'public'`, top + range). Unchanged in this set.
4. **Tier split.** Account-tier to view My / Followed lists; membership-tier to create, edit,
   delete, add, remove, reorder, and follow.
5. **Offline-first `playlistRepository`.** Migration 17 (`playlist` + `playlist_resource`); screens
   stop calling `req*` directly. Reads work offline from cache; writes while Offline Mode is on are
   refused (no playlist outbox).
6. **Reorder and remove live on detail** behind an owner-only edit-items mode (extends today's
   reorder toggle). Not a separate Items tab route.
7. **Long-press whole-row drag** for reorder, reusing the queue's `ReorderableSections` extension
   and drop → first / last / between math. Swipe-only remove via `SwipeActionRow`.
8. **Row tap plays** and seeds the playlist auto-queue (web row-click parity). No navigation to
   episode detail from the playlist row in view mode.
9. **Web is the authority.** No legacy screenshots were provided for this area.

### Derived from the rules, not optional

10. **List virtualization.** Library playlists must use `FillList` / `FlatList`, not `.map()`.
11. **Filter/sort persistence.** Chip, sort, and range (when top) persist per the library-playlists
    instance.
12. **Native-cache projection** on playlist mutations that affect car browse.

## Sorting (operator: "use the most relevant")

- Library My / Followed: recent (default), oldest, A–Z, top + range — matching web private sorts.
- Browse public: top + range only (API has no other public list endpoints).
- Web already sorts playlists; no web sort work in this set. Public A–Z / recent and Library AV /
  Music medium filter are deferred in [778](/docs/proposals/mobile/_master-plan_/phase-2/details/778-defer-playlist-medium-and-public-sort.md).

## Consequences to handle in the set

- **Hard dependency on queue (757–759).** Step 04 assumes long-press body-drag and a tested drop
  resolver already exist. Do not start this set until queue is done.
- **Three gestures on one edit-items row** (tap play, swipe remove, long-press drag) — same risk
  class as queue 03; step 04 is Opus 5.
- **Add-by-RSS row mapper** must be fixed in 01 or detail silently stays incomplete.
- **Missing catalog key** `instructions.login_for_playlists` (web references it; queues/history have
  peers) — add in closeout.

## Not in this set

- Liked playlists and per-row like toggles ([777](/docs/proposals/mobile/_master-plan_/phase-2/details/777-defer-liked-playlist-and-row-likes.md))
- Public playlist sorts beyond top; Library AV / Music medium filter ([778](/docs/proposals/mobile/_master-plan_/phase-2/details/778-defer-playlist-medium-and-public-sort.md))
- Combined mine+followed endpoint; Home Playlists chip
- Playlist mutation outbox / offline writes
- Profile playlists tab redesign (existing profile AZ list stays as-is unless broken by the
  repository migration)
- DnD polish still deferred in [599](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md)

## No legacy screenshots for this area

Phase 2 is normally driven by legacy-app screenshots. None were provided for playlists; decisions
came from nextgen web plus operator answers in chat. If the legacy `PlaylistsScreen` /
`PlaylistScreen` / `EditPlaylistScreen` / `PlaylistsAddToScreen` had affordances this list omits,
they are unrecorded, not rejected.

## Cross-surface note

Implementation is mobile-only. Every playlist endpoint already exists; no API, ORM, or DTO shape
change. The one shared-catalog touch is the missing `instructions.login_for_playlists` key (and any
new mobile-only chrome keys if needed). Nothing here changes a persisted DTO field name.
