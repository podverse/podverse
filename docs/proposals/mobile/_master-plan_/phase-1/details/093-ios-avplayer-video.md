# 093-ios-avplayer-video

**Master step:** 2.14
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Extend the existing single shared `AVPlayer` (`PodverseAudioEngine.shared`) so the **same**
  instance can play video enclosures (MP4 / HLS video) without creating a second player.
- Attach an `AVPlayerLayer` (owned by VideoSurfaceHost in 2.16) when the item has video tracks;
  audio-only items keep current behavior (no visible layer).
- Do not remount or replace the player when switching audio↔video items — replace `AVPlayerItem`
  only.

## Architecture notes

- Car foundation: one process-wide player remains; CarPlay will still bind to
  `PodverseAudioEngine.shared`.
- Video presentation is owned by native (`AVPlayerLayer` / host), not by an RN `<Video>` view.
- Cross-deps: 2.16 host, 2.18–2.20 attach/animate/reparent, 2.23 hide-when-audio.

## Edge cases

- Audio-only enclosure after a video item: detach/hide layer; keep player instance.
- Live / unknown duration: do not assume finite `duration`.
- DRM / unsupported codecs: emit mapped error (2.27); do not crash.

## Acceptance criteria

- One `AVPlayer` plays both audio and video items.
- Video frames render only via the shared surface host (2.16), not a second player.
- Lock-screen / remote commands still drive the same instance.
- No `react-native-track-player` / second RN video component.

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- Master plan § Seamless video architecture
- [081-native-playback-bridge-interface](./081-native-playback-bridge-interface.md)

## Verification

```bash
# Mobile iOS — manual: load a video enclosure via debug panel or play path; confirm frames
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.4–2.6 audio spike (`done`); GO gate 2.34
