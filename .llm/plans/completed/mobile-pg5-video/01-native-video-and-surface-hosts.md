# 01 — Native video + VideoSurfaceHost (2.14–2.17)

**Cursor model:** Opus 4.8  
**Details:** [093](../../../../docs/proposals/mobile/_master-plan_/details/093-ios-avplayer-video.md),
[094](../../../../docs/proposals/mobile/_master-plan_/details/094-android-exoplayer-video.md),
[095](../../../../docs/proposals/mobile/_master-plan_/details/095-ios-video-surface-host.md),
[096](../../../../docs/proposals/mobile/_master-plan_/details/096-android-video-surface-host.md)

## Goal

Make the existing single iOS `AVPlayer` and Android `ExoPlayer` video-capable and introduce one
native **VideoSurfaceHost** per platform that owns the only video surface for the session.

## Implement

1. **iOS (2.14 + 2.16):** Extend `PodverseAudioEngine.swift` for video items; add VideoSurfaceHost
   owning a single `AVPlayerLayer`. No second `AVPlayer`.
2. **Android (2.15 + 2.17):** Extend `PodverseAudioEngine.kt` for video surfaces; add
   VideoSurfaceHost bound to the shared ExoPlayer / Media3 session. No second player.
3. Keep car-foundation invariants: one player, one remote command center / MediaLibrarySession.
4. Update module README only as needed for new host types (2.29 already done — incremental edit OK).

## Do not

- Mount RN `<Video>` / `expo-video` for the product player.
- Implement bridge attach/animate yet (prompt 02).
- Touch Track 12 car templates.

## Done when

- Master steps 2.14–2.17 → `done`; Appendix C + detail headers `done`.
- Operator can later attach a surface via upcoming bridge APIs.

## Verification (operator only — do not run in agent)

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
