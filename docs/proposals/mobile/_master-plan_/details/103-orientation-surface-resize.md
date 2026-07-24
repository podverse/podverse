# 103-orientation-surface-resize

**Master step:** 2.24
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- On orientation / window size changes, remeasure RN placeholders and call `attachVideoSurface`
  with updated rects **without** resetting the player or seeking to zero.
- Works for both `mini` and `full` targets.

## Architecture notes

- App may remain portrait-locked in `app.config.ts` today — still handle layout changes (split
  view, keyboard, dynamic island / inset changes).
- If landscape unlock is added later, same rect-update path applies.

## Edge cases

- Animate in flight during rotate: cancel/snap then re-attach.
- Android config change recreating Activity: host reattach (2.17) + JS remeasure.

## Acceptance criteria

- Orientation/layout change updates surface geometry only.
- Playback position and rate unchanged.
- No black flash from remounting a second video view.

## Web parity references

- [099-surface-reparent-implementation](./099-surface-reparent-implementation.md)
- Track 11.8 position continuity

## Verification

```bash
# Manual rotate / resize while video playing (device or simulator)
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.18, 2.21–2.22
