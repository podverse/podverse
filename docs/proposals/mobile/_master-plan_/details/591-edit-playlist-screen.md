# 591-edit-playlist-screen

**Master step:** 9d.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Functional sketch: edit playlist metadata (owner-only) via `reqPlaylistEdit`
  (`PATCH /playlist/:id_text`).
- Sketch only — Track 23 for visual polish.

## Acceptance criteria

- Owner can update title/privacy (or web-parity fields) and see updated detail
- Non-owners cannot edit; error/empty sketched
- `testID`s present

## Web parity references

- Web playlist edit under `apps/web/src/app/playlist/`

## Verification

```bash
npm run mobile:e2e:test -- library-playlists
```
