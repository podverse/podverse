# 096-android-video-surface-host

**Master step:** 2.17
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement a native Android **VideoSurfaceHost** overlay that owns the single video surface /
  `PlayerView` for the lifetime of a playback session, bound to the shared ExoPlayer.
- Managed by `podverse-media-engine`; RN does not own a second player view.
- Supports named targets (`mini`, `full`) and reparent/animate (2.18–2.20).

## Architecture notes

- Prefer a window-level overlay or reparentable view group so mini↔full does not tear down ExoPlayer.
- Coordinate space must match JS-reported layout rects (density-aware).
- Keep `MediaLibraryService` independent of the surface host — service owns playback, host owns
  pixels.

## Edge cases

- Configuration change / Activity recreate: reattach surface without `load` restart when possible.
- Multi-window / foldables: rely on JS rect updates (2.24).
- No target registered → hide surface.

## Acceptance criteria

- One surface/view pipeline for video; no second ExoPlayer on expand.
- Host can place the surface at arbitrary rects from bridge APIs.
- Audio-only hides the host (2.23).

## Web parity references

- Master plan § Seamless video architecture
- [094-android-exoplayer-video](./094-android-exoplayer-video.md)
- [363-anti-pattern-no-second-video](./363-anti-pattern-no-second-video.md)

## Verification

```bash
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

## Depends on

- 2.15
