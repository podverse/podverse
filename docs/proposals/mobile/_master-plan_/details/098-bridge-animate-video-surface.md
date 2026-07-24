# 098-bridge-animate-video-surface

**Master step:** 2.19
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Add bridge API `animateVideoSurface(toTargetId, durationMs)` that animates the single native
  surface from the current target rect to the registered `toTargetId` rect.
- Used on mini→full expand and full→mini collapse (Track 11.6–11.7).
- Must not reload media or reset playhead.

## Architecture notes

- Native owns the animation (UIView / ValueAnimator); JS only triggers and provides duration.
- If `toTargetId` has no rect yet, no-op or queue until attach (document choice).
- Position continuity verified in 2.20 / 11.8.

## Edge cases

- Animate while paused: still move surface; do not auto-play.
- Overlapping animate calls: cancel prior animation or coalesce to latest target.
- `durationMs <= 0`: snap without animation.

## Acceptance criteria

- Animate updates only surface geometry; player instance and position unchanged.
- Works iOS + Android with registered `mini`/`full` targets.
- Documented on bridge contract + README.

## Web parity references

- Master plan § Seamless video architecture
- Track 11.6–11.7 details 351–352

## Verification

```bash
# Manual after RN expand/collapse wiring
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.18 attach API; 2.16 / 2.17 hosts
