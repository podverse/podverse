# 388-ios-carplay-now-playing

**Master step:** 12.9
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Bind CarPlay now-playing to the **one** shared `PodverseAudioEngine.shared` `AVPlayer`.
- When the user plays a cached item (download `file://` or queue/library `mediaUrl`), load via the
  engine and surface `CPNowPlayingTemplate` / system Now Playing (parity with Android Auto play
  through the shared ExoPlayer session — detail 394).
- Update `MPNowPlayingInfoCenter` metadata (title, artwork when available) from the chosen cache
  entry — engine already owns now-playing info; CarPlay must not create a second player.

## Architecture notes

- Resolve playable URL the same way as Android 12.15: prefer download `filePath` → `file://`, else
  remote `mediaUrl` from cache entry.
- Queue snapshot may have `mediaUrl: null` today — Downloads path must work for AA parity ship bar;
  document soft-fail if streamed URL missing.
- Do not start Metro/JS to play.

## Acceptance criteria

- Play from Downloads on CarPlay starts audio on `PodverseAudioEngine.shared`.
- Lock screen / Control Center reflect the same playback.
- No second `AVPlayer` instance.

## Verification

```bash
rg -n 'CPNowPlaying|PodverseAudioEngine.shared|load\\(|play\\(' apps/mobile/modules/podverse-media-engine/ios
# Operator: CARPLAY-SIMULATOR-CHECKLIST.md play section
```

## Implemented (this slice)

- `PodverseCarPlaySceneDelegate.playDownload` resolves the entry URL (`file://` local first, else
  remote — parity with Android `fileUriOrRemote` / 394), calls
  `PodverseAudioEngine.shared.loadAndStart`, then `setNowPlayingMetadata(title:)`, and presents
  `CPNowPlayingTemplate.shared`.
- New engine method `setNowPlayingMetadata(title:artist:)` overrides the placeholder file-name title
  with the cache entry's real title (lock screen + CarPlay); metadata only — no second player.
- Soft-fail (NSLog) when no resolvable URL or `loadAndStart` throws; never crashes.

## Depends on

- 12.7, 12.8
- Engine singleton (Track 2)
- Detail 394 Android play resolution (behavioral parity)
