# 590-create-playlist-screen

**Master step:** 9d.1
**Model (author + implement):** Codex 5.3
**Status:** draft

## Scope

- Functional sketch: create playlist (title / privacy) via existing playlist create API.
- Entry from library playlists list; navigate to detail on success.
- Use primitives + tokens; **not** Track 23 polish.

## Acceptance criteria

- Authenticated user can create a playlist and land on detail
- Loading / error / validation sketched with `testID`s
- No pixel-perfect form chrome required

## Web parity references

- Web playlists create flow under `apps/web/src/app/playlists/` / playlist components

## Verification

```bash
npm run mobile:e2e:test -- library-playlists
```
