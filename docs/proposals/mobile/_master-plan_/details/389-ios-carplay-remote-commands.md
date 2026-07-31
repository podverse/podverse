# 389-ios-carplay-remote-commands

**Master step:** 12.10
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Ensure CarPlay remote commands use the **one** shared `MPRemoteCommandCenter` registration owned
  by `PodverseAudioEngine` (play/pause/skip/seek as already registered for lock screen).
- Do **not** register a second command center in the CarPlay scene.
- Confirm CarPlay now-playing chrome drives the same handlers as phone lock screen.

## Architecture notes

- Engine README / `PodverseAudioEngine.swift` already documents single registration for future
  CarPlay (12.9–12.10). This step is verify + any thin scene glue, not a second policy layer.
- Queue advance policy stays in `@podverse/playback-core` when JS is alive; app-closed skip uses
  engine/session behavior already present (document known gaps vs full auto-queue refill).

## Acceptance criteria

- Play/pause (and skip if supported) from CarPlay affect the shared engine.
- Only one `MPRemoteCommandCenter` registration path in the process.
- Module README notes CarPlay remotes share the engine command center.

## Verification

```bash
rg -n 'MPRemoteCommandCenter|remoteCommandCenter' apps/mobile/modules/podverse-media-engine/ios
```

## Implemented (this slice)

- CarPlay presents `CPNowPlayingTemplate.shared`, which binds to `MPNowPlayingInfoCenter` +
  `MPRemoteCommandCenter` — both owned by `PodverseAudioEngine.registerRemoteCommands()`. The CarPlay
  scene registers **no** second command center (verified: only `PodverseAudioEngine.swift` touches
  `MPRemoteCommandCenter`).
- README "iOS CarPlay scene" section documents the single-command-center contract and the known
  app-closed auto-queue-refill gap (policy stays in `@podverse/playback-core`).

## Depends on

- 12.9 now-playing bind
- Track 2 iOS remotes (done)
