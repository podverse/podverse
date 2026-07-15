# 223-library-stack

**Master step:** 7.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Nested stack under **My Library** tab: entry points for playlists, history, queues, downloads
  (placeholders until Tracks 9–10 / 13).
- Single library hub screen listing those destinations is fine for scaffolding.

## Acceptance criteria

- Tab labeled My Library (not “Playlists” alone)
- Stack routes registered for hub + each entry

## Web parity references

- Web library / playlist / history / queue pages consolidated under one mobile tab

## Verification

```bash
rg -n "Library|MyLibrary" apps/mobile/src/navigation || true
```
