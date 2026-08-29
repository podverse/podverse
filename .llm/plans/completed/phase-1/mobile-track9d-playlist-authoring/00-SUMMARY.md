# Track 9d — Playlist / library authoring (functional sketch)

**Phase slug:** `mobile-track9d-playlist-authoring`  
**Master steps:** 9d.1–9d.5  
**Detail IDs:** 590–594  
**Parallel group:** PG-6.7  
**Ship bar:** Working screens + API wiring + `testID`s. No pixel polish, no fancy DnD chrome
(21.12 / Track 23). Clip create/edit stays deferred (21.4).

## Prerequisites

- Track 9.10–9.11 (playlists list + detail) **done**
- Track 9c media-row actions **done** (`MediaRowActions` already has `onAddToPlaylist` prop —
  callers may not wire it yet)
- Auth + `requestWithMobileAuthRefresh` patterns in library screens

## APIs (helpers-requests)

- Create: `reqPlaylistCreate` (`POST /playlist`)
- Edit: `reqPlaylistEdit` (`PATCH /playlist/:id_text`)
- Add item: `reqPlaylistResourceItemAddLast` / clip / soundbite variants
- Reorder: `*AddBetween` with prev/next `list_position` — mirror web
  `ListPlaylistResources.tsx` (prefer **up/down** buttons on mobile for the sketch)

## Model mix

| Model     | Steps        |
| --------- | ------------ |
| Codex 5.3 | 9d.1–9d.4    |
| Auto      | 9d.5         |

## After this phase

Continue master-plan sequence (downloads / car / settings). Track 23 polish later.
