# 099-surface-reparent-implementation

**Master step:** 2.20
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement the native reparenting / frame-move logic so the **same** video surface view moves
  between registered layout targets (driven by attach + animate).
- No teardown of `AVPlayer` / ExoPlayer on target switch.
- Encode the invariant: one surface owner for the session.

## Architecture notes

- iOS: move/resize `AVPlayerLayer` (or hosting UIView) between target frames.
- Android: reparent or translate the single `PlayerView` / surface holder between overlay slots.
- JS never creates a second video component (11.18).

## Edge cases

- Target removed while visible: hide surface; keep playback.
- Rapid mini↔full: last wins; no double surfaces.
- Audio-only mid-session: hide without destroying player (2.23).

## Acceptance criteria

- Expanding/collapsing changes only surface geometry/parenting.
- Playhead continuous across reparent (feeds 11.8).
- Documented in module README with anti-pattern note.

## Web parity references

- Master plan § Seamless video architecture
- [363-anti-pattern-no-second-video](./363-anti-pattern-no-second-video.md)

## Verification

```bash
# After 2.21–2.22 RN targets — expand/collapse mid-playback
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

## Depends on

- 2.16–2.19

## Addendum (Plan 01 gap remediation)

The initial 2.20 landing reframed a **process-global overlay** (iOS key window / Android
`android.R.id.content`) to RN-measured rects. That overlay is drawn **behind** the React Navigation
`presentation: 'modal'` full player (native-stack VC / react-native-screens fragment), so the full
player only showed the artwork fallback — the acceptance criterion "expanding changes only surface
geometry" was not met visually in the full player.

Remediation (this pass): the single surface is **reparented into an RN-mounted native view**
(`PodverseVideoSurfaceView`, iOS + Android) that each player mounts. Because the view lives in the RN
tree (including the modal's own window), z-order and coordinate space are correct in both mini and
full. `animateVideoSurface('mini' | 'full')` now flips the active reparent target; the rect-based
`attachVideoSurface` is retained only for the JS bridge/serialization contract + unit tests (native
no-op). Status stays `done`; **on-device** verification is required (Maestro cannot observe
occlusion — see `.llm/plans/completed/phase-1/mobile-pg5-video-gaps/01-video-surface-reparent.md`).
