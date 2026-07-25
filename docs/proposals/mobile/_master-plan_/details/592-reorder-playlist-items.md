# 592-reorder-playlist-items

**Master step:** 9d.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Functional reorder of playlist resources (up/down buttons **or** basic drag).
- **Not** pixel-perfect DnD chrome (handles, haptics, animations) — deferred **21.12** / Track 23.

## Acceptance criteria

- Owner can change item order and persist via playlist APIs
- Order reflected after reload
- `testID`s for reorder controls

## Web parity references

- Web playlist resource ordering

## Verification

```bash
npm run mobile:e2e:test -- library-playlists
```
