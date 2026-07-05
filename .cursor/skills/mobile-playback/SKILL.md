---
name: mobile-playback
description: Map web playback policy to NativePlaybackBridge and podverse-media-engine — playback-core, queue/auto-queue parity, seamless video reparenting, background Now Playing. Do not use react-native-track-player.
---

# Mobile playback and queue parity

Use when implementing or changing **mobile playback**, **queue advance**, **auto-queue**, or the
**native bridge** under `apps/mobile/`.

## When to use

- Play/pause/seek/skip/load from RN screens
- Queue now-playing updates, ended/skip orchestration, auto-queue advance
- Mini player ↔ full player **video** transitions
- Background audio, lock-screen controls, writing the **native car cache**
- Wiring `@podverse/playback-core` after PG-1 extraction

## Stack map (web → mobile)

| Web layer | Location | Mobile equivalent |
| --------- | -------- | ----------------- |
| Policy (pure) | `apps/web/src/lib/playback/` → `@podverse/playback-core` | **Same** `@podverse/playback-core` functions |
| Bridge | `useMediaElementBridge`, `mediaElementBridgeSurface.ts` | **`NativePlaybackBridge`** TS module → `podverse-media-engine` |
| Controls | `useMediaPlayerControls()` | RN controls store/hook exposing `seek`, `loadAndStart`, `pauseAt`, etc. |
| Orchestration | `NonLiveMediaOrchestrator`, ended handlers | RN orchestrator hook on engine **ended** events |
| Queue load | `useQueueResourcesLoadActive`, queue wrappers | Same `req*` from `@podverse/helpers-requests` |
| Auto-queue | `AutoQueue.tsx`, `useAutoQueueLoadResources` | Same API calls; device prefs instead of cookies (`aqc.rd` / `aqc.rp`) |

Read web hooks first for behavior; reuse wrappers and policy — replace only transport and UI.

## Media engine (Track 2)

**Do not use `react-native-track-player`.** Podverse uses **`apps/mobile/modules/podverse-media-engine/`**:

- **One shared native player** per session (AVPlayer iOS / ExoPlayer Android)
- Background survival via native audio session + Android foreground **MediaSessionService**
- Lock screen / headset: `MPNowPlayingInfoCenter` + `MPRemoteCommandCenter` (iOS), MediaSession (Android)
- Bridge methods (Track 2): `load`, `play`, `pause`, `seek`, `setRate`, `getPosition`, `getDuration`, `destroy`

`NativePlaybackBridge` is the **only** place RN should imperatively drive the engine — parallels ESLint
guards on web's bridge (see **media-player-architecture**).

## Playback policy flow

```text
Play action → RN resource-update hook
  → resolvePlaybackLoadDecision (@podverse/playback-core)
  → NativePlaybackBridge.loadAndStart (or seek/pauseAt per decision)
  → podverse-media-engine
```

Handle every `PlaybackTarget.kind` (`item-podcast`, `item-video`, `item-music` + `intent`, `clip`,
`soundbite`, `chapter`, `add-by-rss`). Defer `livestream` (native HLS, separate effort).

Reference: [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md §5–10](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md).

## Queue + auto-queue on ended/skip

1. Move now-playing to history (same POST wrappers as web).
2. If manual upcoming has items → load next manual item.
3. Else increment auto-queue row → load prefetched resource (playlist or channel sources unchanged).
4. Run `playback-core` decision → bridge `loadAndStart`.
5. **Write native cache snapshot** (feeds CarPlay/Android Auto — **mobile-carplay-android-auto** rule).

Web reference hooks: `useQueueResourceMoveNowPlayingToHistory`, `useMediaPlayerControllerQueueHeadLoading`,
`combineQueueNowPlayingAndUpcoming` (moving to playback-core).

## Seamless video (mini ↔ full player)

One **persistent native video surface** for the playback session. Mini and full player screens register
**target layout rects** (x, y, width, height, corner radius); the engine **reparents** the same native
view — **no player remount** on expand/collapse.

- iOS: `AVPlayerLayer` in engine-managed overlay
- Android: Media3 `PlayerView` / `SurfaceView` on the single ExoPlayer instance
- RN renders transparent placeholders; native module positions the surface above them
- Audio-only: same engine, no visible surface

The old pattern of recreating the player on full-screen open is **forbidden** (master plan Track 2
seamless video architecture).

## Native car cache writes

Whenever queue, auto-queue, or downloads metadata changes, JS must update the native cache so car
surfaces work app-closed. Schema: Track **12.1**; implementation steps **10.22**, **12.4**, **2.35**.

## Do / don't

- **Do** call `@podverse/playback-core` for seek/resume/auto-play/`pauseAt` decisions.
- **Do** route UI actions through the mobile controls hook → bridge (not direct engine calls from screens).
- **Do** mirror web `req*` sequences for queue/playlist/auto-queue.
- **Don't** edit `useMediaElementBridge` for mobile behavior.
- **Don't** duplicate policy logic in RN or native Swift/Kotlin.
- **Don't** use Playwright or `make e2e_*` for mobile playback verification — Maestro/Detox (**mobile-e2e-screenshots**).

## Related

- **media-player-architecture** — web non-live stack and decision matrix pointer
- **mobile-carplay-android-auto** — car native-only + cache contract
- [MEDIA-PLAYER-DECISION-MATRIX.md](/apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md) — behavioral reference
- Master plan **Track 2** (engine), **Track 10** (queue), **Track 11** (mini/full player UI)
