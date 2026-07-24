# 593-add-to-playlist-more-sheet

**Master step:** 9d.4
**Model (author + implement):** Codex 5.3
**Status:** draft

## Scope

- Wire “add to playlist” from media-row more sheet (Track 9c inventory) to playlist APIs.
- Functional picker sketch (list of playlists + confirm) — not polished modal design.

## Acceptance criteria

- More sheet exposes add-to-playlist with correct i18n key
- Item appears on chosen playlist after success
- Errors sketched; `testID`s present

## Web parity references

- Web `features.playlist.add_to_playlist` overflow action

## Verification

```bash
npm run mobile:e2e:test -- home
```
