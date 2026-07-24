# 101-rn-full-player-surface-target

**Master step:** 2.22
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- RN full player registers `targetId=full` rect; expand triggers `animateVideoSurface('full', …)`,
  not remount / reload.
- Collapse animates back to `mini` (coordination with 2.19 / 11.7).
- Complements Track 11.6–11.7 UI steps — this step owns registration + animate trigger wiring.

## Architecture notes

- Expand is navigation + animate only — see existing 11.4 audio expand-without-reload.
- Full player placeholder is transparent; native surface paints frames.
- Reuse shared rect-publish helper from 2.21.

## Edge cases

- Expand before mini rect exists: attach full first, then animate when both ready.
- Android back dismiss: same collapse path as close control (docs already note Maestro Back).
- Orientation change while full open: 2.24 remeasure without reload.

## Acceptance criteria

- Opening full player does not call `bridge.load` / `bridge.destroy`.
- `animateVideoSurface` runs to `full` on expand and `mini` on collapse.
- Position continuous (assert in 11.8 / 2.33).

## Web parity references

- [351-full-player-video-surface](./351-full-player-video-surface.md)
- [352-collapse-to-mini-animation](./352-collapse-to-mini-animation.md)
- `apps/mobile/src/screens/player/FullPlayerScreen.tsx`

## Verification

```bash
# After video sample available
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 2.18–2.21; Track 11.4–11.5 (`done`)
