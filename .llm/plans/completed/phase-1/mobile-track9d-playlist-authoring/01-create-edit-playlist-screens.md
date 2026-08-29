# 01 — Create + edit playlist screens (9d.1, 9d.2)

**Cursor model:** Codex 5.3  
**Details:** 590, 591  
**Ship bar:** Functional forms only — primitives + tokens; no Track 23 polish.

## Goal

Add create and edit playlist screens (title / privacy / description as web parity allows) wired to
`reqPlaylistCreate` / `reqPlaylistEdit` via `ApiRequestService` + `requestWithMobileAuthRefresh`.

## Context (read first)

- Details 590, 591
- `apps/mobile/src/screens/library/LibraryPlaylistsScreen.tsx`
- `apps/mobile/src/screens/library/PlaylistDetailScreen.tsx`
- `apps/mobile/src/navigation/index.tsx` (`LIBRARY_STACK_ROUTES`)
- `packages/helpers-requests/src/api/playlist/playlist.ts` (`reqPlaylistCreate`, `reqPlaylistEdit`)
- Web: `apps/web/src/app/playlists/`, playlist edit on detail
- Skills: **mobile-theme-parity** (ship bar), **mobile-data-layer** (prefer repositories if a
  playlist repo already exists; otherwise thin screen → `requestWithMobileAuthRefresh` is OK for
  this sketch — do not invent a large data-layer redesign)
- Rules: **i18n-user-facing-strings**, **mobile-surface-async-errors**, **eqeqeq**, no `any`

## Tasks

1. **Routes** — Add `PlaylistCreate` and `PlaylistEdit` (or one form with mode) to Library stack
   param list + stack screens; titles via i18n (`features.playlist.*` keys preferred).
2. **Create (9d.1)** — Form: title (required), optional description, sharable/privacy using the
   same `sharable_status_id` semantics as web (look up web create form). Entry: button on
   `LibraryPlaylistsScreen` (`testID` e.g. `library-playlists-create`). On success navigate to
   `PlaylistDetail` with new `id_text`.
3. **Edit (9d.2)** — Owner-only entry from playlist detail header/actions. Pre-fill fields; PATCH
   via `reqPlaylistEdit`; refresh detail. Non-owner: hide edit affordance.
4. Loading / error / validation sketched with stable `testID`s; surface async errors in UI.
5. Mark **9d.1, 9d.2** `done` in master plan Tracks + Appendix C; detail headers `done`.

## Out of scope

- Clip authoring (21.4), pixel polish, drag chrome
- Delete playlist (unless trivial and already on web parity — optional, not required)

## Acceptance

- Authenticated user can create a playlist and land on detail
- Owner can edit metadata and see updates
- Unauthenticated users see existing auth-aware empty/login path (no crash)
