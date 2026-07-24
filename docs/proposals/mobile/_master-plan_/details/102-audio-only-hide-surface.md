# 102-audio-only-hide-surface

**Master step:** 2.23
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Hide the video surface when the active item is audio-only; show when `PlaybackTarget` / enclosure
  is video.
- Driven from playback state in JS (medium / mime / decision) + native host visibility.
- Must not destroy the player when hiding.

## Architecture notes

- Prefer a single `setVideoSurfaceVisible(boolean)` or implicit hide when no video tracks — document
  the chosen API on the bridge.
- Align with `resolveEnclosureUrl` / playback-core video kinds once video play path is enabled
  (today mobile may force audio track — lift that guard as part of this work or adjacent PG-5
  play-path fix).

## Edge cases

- Switch video→audio mid-queue: hide immediately; artwork remains in RN chrome.
- Switch audio→video: show surface at current target without reload if URL already loaded.
- Unknown mime: treat as audio-only until proven video.

## Acceptance criteria

- Audio items never leave a black video rectangle visible.
- Video items show surface at active target.
- Hide/show does not call `destroy` or reset position.

## Web parity references

- `@podverse/playback-core` target kinds
- Master plan seamless video notes

## Verification

```bash
# Manual: queue audio then video items; observe surface visibility
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.16–2.18; Track 10 orchestrator (`done`)
