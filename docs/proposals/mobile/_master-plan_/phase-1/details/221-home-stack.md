# 221-home-stack

**Master step:** 7.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Nested stack under Home tab for podcast → episode → clip push routes.
- Placeholder screens OK if Track 9 screens not ready; register route names matching future
  `PodcastDetail` / `EpisodeDetail` / `ClipDetail`.
- Params: resource id / idText stubs aligned with web URL ids.

## Acceptance criteria

- Push/pop within Home stack does not unmount other tabs
- Route names documented in `apps/mobile/src/navigation/`

## Web parity references

- Web `/podcast/[id]`, `/episode/[id]`, clip routes

## Verification

```bash
test -d apps/mobile/src/navigation
```
