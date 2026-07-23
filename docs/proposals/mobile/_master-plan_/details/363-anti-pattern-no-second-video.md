# 363-anti-pattern-no-second-video

**Master step:** 11.18
**Model (author + implement):** Auto
**Status:** done

## Scope

- Document anti-pattern: never mount second Video component on full screen open.
- abcmemory / APPS-MOBILE / media-engine README note.

## Acceptance criteria

- Doc exists under apps/mobile (README or AGENTS) stating single native surface ownership
- References VideoSurfaceHost / bridge attach APIs
- Linked from Track 11 player module comments

## Verification

```bash
test -f apps/mobile/APPS-MOBILE.md
rg -n "second Video|VideoSurfaceHost|anti-pattern" apps/mobile
```

## Implementation notes

- Anti-pattern documented in [apps/mobile/modules/podverse-media-engine/README.md § Player UI
  single-surface ownership](/apps/mobile/modules/podverse-media-engine/README.md) and
  [apps/mobile/APPS-MOBILE.md § Player UI](/apps/mobile/APPS-MOBILE.md): one engine + one
  `VideoSurfaceHost`, re-parented (bridge attach / `animateVideoSurface`) between `mini` and `full`
  targets — never a second `Video`/engine on expand.
- Cross-linked from `FullPlayerScreen.tsx` and `MiniPlayer.tsx` module comments.
- Discoverable via `rg -n "second Video|VideoSurfaceHost|anti-pattern" apps/mobile`.
