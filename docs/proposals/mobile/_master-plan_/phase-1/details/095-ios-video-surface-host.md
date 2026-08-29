# 095-ios-video-surface-host

**Master step:** 2.16
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement a native iOS **VideoSurfaceHost** overlay that owns the single `AVPlayerLayer` for the
  lifetime of a playback session.
- Host is managed by `podverse-media-engine` (not by RN view trees mounting video).
- Supports registering named layout targets (`mini`, `full`) and moving/animating the layer frame
  between them (2.18–2.20).

## Architecture notes

- RN screens render transparent placeholders; native positions the layer above them in window
  coordinates.
- Corner radius / clipping follow registered layout rects from JS.
- Anti-pattern (11.18): never let RN mount a second video view.

## Edge cases

- App backgrounding: keep player; host may hide or retain last frame per OS rules.
- Safe area / keyboard: rect updates from JS (2.21 / 2.24), not hardcoded insets in native.
- No registered target: hide surface (do not invent a default full-screen player).

## Acceptance criteria

- Exactly one `AVPlayerLayer` exists while a video item is active.
- Host can show the layer at an arbitrary window rect without recreating the player.
- Audio-only items leave the host empty/hidden (2.23).

## Web parity references

- Master plan § Seamless video architecture
- Track 11.18 / detail [363-anti-pattern-no-second-video](./363-anti-pattern-no-second-video.md)

## Verification

```bash
# After bridge attach lands — operator visual check on simulator
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.14 (shared AVPlayer video-capable)
