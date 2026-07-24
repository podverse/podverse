# 094-android-exoplayer-video

**Master step:** 2.15
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Extend the existing single Media3 `ExoPlayer` (`PodverseAudioEngine`) so the same instance can
  render video tracks via a surface owned by VideoSurfaceHost (2.17).
- Do not create a second ExoPlayer for video items or for mini↔full transitions.
- Keep `MediaLibraryService` / `MediaLibrarySession` bound to this same player.

## Architecture notes

- Android Auto (Track 12) continues to use the one session wrapping this player.
- Prefer Media3 `PlayerView` / `SurfaceView` / `TextureView` hosted natively — RN only registers
  layout rects (2.18–2.22).
- Cross-deps: 2.17 host, 2.18–2.20, 2.23.

## Edge cases

- Audio-only after video: clear video surface / hide host; keep ExoPlayer.
- Surface destroyed while playing (Activity recreate): re-attach without reload if possible.
- Unsupported format → mapped error (2.27).

## Acceptance criteria

- One ExoPlayer plays audio and video enclosures.
- Video renders only through the shared surface host.
- Media notification / lock-screen still control the same player.
- No second player or RN `<Video>` for full-screen expand.

## Web parity references

- Master plan § Seamless video architecture
- [086-android-exoplayer-audio](./086-android-exoplayer-audio.md)
- [087-android-foreground-media-service](./087-android-foreground-media-service.md)

## Verification

```bash
npm run mobile:android -- --device Pixel_6_Pro_API_33
# Manual: play a video enclosure; confirm frames + media notification
```

## Depends on

- 2.7–2.9 audio spike (`done`); GO gate 2.34
