# 03 — RN targets, hide surface, orientation (2.21–2.24)

**Cursor model:** Opus 4.8  
**Details:** [100](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/100-rn-mini-player-surface-target.md),
[101](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/101-rn-full-player-surface-target.md),
[102](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/102-audio-only-hide-surface.md),
[103](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/103-orientation-surface-resize.md)

## Goal

RN mini/full player placeholders register layout rects, expand/collapse animates the native
surface, audio-only hides it, and layout/orientation updates never reload the engine.

## Implement

1. Shared rect-publish helper; wire `MiniPlayer` → `attachVideoSurface('mini', …)`.
2. Wire `FullPlayerScreen` expand/collapse → `animateVideoSurface` (+ attach `full`).
3. Hide surface for audio-only; show for video (lift audio-only enclosure guard if still forcing
   audio track for video items — keep policy in playback-core).
4. Remeasure on layout/orientation/keyboard without `load`/`destroy`.
5. Align with deferred Track 11.3 / 11.6–11.7 detail docs (may complete those UI bits here if
   required for registration — mark those master steps `done` only if fully accepted).

## Do not

- Mount a second Video component.
- Implement Track 11 video E2E (11.15–11.17) here — that’s prompt 06 / follow-on.

## Done when

- Steps 2.21–2.24 `done`.
- Expand/collapse video keeps playhead (smoke).

## Verification (operator)

```bash
npm run mobile:e2e:test -- play-mini-player
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
