# 02 — Bridge attach / animate / reparent (2.18–2.20)

**Cursor model:** Opus 4.8  
**Details:** [097](../../../../docs/proposals/mobile/_master-plan_/details/097-bridge-attach-video-surface.md),
[098](../../../../docs/proposals/mobile/_master-plan_/details/098-bridge-animate-video-surface.md),
[099](../../../../docs/proposals/mobile/_master-plan_/details/099-surface-reparent-implementation.md)

## Goal

Expose `attachVideoSurface` and `animateVideoSurface` on native + JS `NativePlaybackBridge`, and
implement same-surface reparenting between registered targets without reload.

## Implement

1. Extend TS types + Expo module methods + `apps/mobile/src/bridge/` adapter.
2. Native: register targets by id (`mini`, `full`); update rects; animate between them.
3. Reparent/move the **same** surface; never create a second host/player.
4. Document coordinate space + API on module README + bridge contract.

## Do not

- Wire full RN mini/full registration yet (prompt 03) beyond what’s needed to smoke-test from
  debug panel if helpful.
- Call `load`/`destroy` from attach/animate.

## Done when

- Steps 2.18–2.20 `done` in master plan + Appendix C + details.
- Debug or temporary call can move a surface between two rects without restarting audio/video.

## Verification (operator)

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
