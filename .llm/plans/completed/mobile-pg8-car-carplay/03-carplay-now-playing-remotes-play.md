# 03 — Now playing, remotes, play URL resolution (12.9, 12.10)

**Cursor model:** Opus 4.8
**Details:**
[388-ios-carplay-now-playing](/docs/proposals/mobile/_master-plan_/details/388-ios-carplay-now-playing.md),
[389-ios-carplay-remote-commands](/docs/proposals/mobile/_master-plan_/details/389-ios-carplay-remote-commands.md)

## Goal

Playing a CarPlay item uses **`PodverseAudioEngine.shared`** only; remotes share the engine’s
`MPRemoteCommandCenter`. URL resolution matches Android 12.15 (offline `file://` first).

## Do

1. Read details 388 + 389 (and Android 394 for URL parity).
2. On playable select: resolve mediaId → cache entry → `file://` or remote URL → engine load/play.
3. Push/enable now-playing so CarPlay shows transport controls bound to the shared player.
4. Audit: **no** second `MPRemoteCommandCenter` registration in the CarPlay scene.
5. Soft-fail when `mediaUrl` null and no download path (log; don’t crash).
6. Update engine module README CarPlay section.
7. Mark **12.9**, **12.10** + Appendix C **388**, **389** → `done`; check COPY-PASTA box.

## Do not

- Do not create a second AVPlayer for CarPlay.
- Do not reimplement queue policy in Swift.
- Do not run tests during agent work.

## Skills / rules

- **mobile-carplay-android-auto**, **mobile-playback**

## Operator verify (after implement)

```bash
rg -n 'PodverseAudioEngine.shared|MPRemoteCommandCenter|file://|CPNowPlaying' apps/mobile/modules/podverse-media-engine/ios
```
