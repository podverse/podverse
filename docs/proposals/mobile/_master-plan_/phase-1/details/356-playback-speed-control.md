# 356-playback-speed-control

**Master step:** 11.11
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Playback speed control wired to engine `setRate`.

## File paths

- `apps/mobile/modules/podverse-media-engine/src/NativePlaybackBridge.ts`

## Acceptance criteria

- User can set common rates (e.g. 0.5–2x)
- Rate persists for session (and prefs if web does)
- Bridge `setRate` invoked; UI reflects current rate

## Web parity references

- Web speed control
- Bridge: `NativePlaybackBridge.setRate`

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 11.5

## Implementation notes

- `apps/mobile/src/screens/player/FullPlayerSpeedControl.tsx` — toggled inline from the full player's
  `full-player-speed` entry button. Renders rate options (0.5–2x) mirroring the web speed menu
  (`media_player.playback_speed.speeds.*`); the active rate is highlighted from `playbackRate`.
- Pressing a rate calls `usePlayback().setRate` → `NativePlaybackBridge.setRate` (no reload). Rate
  persists for the session via provider state; web-prefs persistence can follow if/when added.
- testIDs: `full-player-speed-control`, `full-player-speed-option-<rate>`.
