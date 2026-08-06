# 513-tablet-player-layout

**Master step:** 18.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Constrain the mini player width and give the full player a two-column layout on tablets so wide
viewports do not stretch controls edge-to-edge.

1. **Mini player.** In
   [`MiniPlayer.tsx`](/apps/mobile/src/components/player/MiniPlayer.tsx), cap the content width on
   tablet (`useResponsive().isTablet`) with a `maxWidth` (e.g. `lg` breakpoint value) and center it;
   phone stays full-bleed. No change to the player state / controls wiring.
2. **Full player.** In
   [`FullPlayerScreen.tsx`](/apps/mobile/src/screens/player/FullPlayerScreen.tsx), on tablet render
   a two-column layout — large artwork on the left, title/controls/up-next on the right. Phone keeps
   the current vertical stack behind the `!isTablet` branch.
3. Functional sketch only: reuse existing artwork, transport, and up-next components; re-parent them
   into the two-column container. Style from `@podverse/design-tokens` — no hardcoded hex/px.
4. `testID`s: preserve existing player ids; add `full-player-two-column` (tablet container).

## Acceptance criteria

- Phone mini + full player unchanged.
- Tablet mini player is width-capped and centered (not stretched full-bleed).
- Tablet full player shows artwork and controls side-by-side; all transport controls work as before.
- Rotation between portrait/landscape re-flows without remounting the audio engine.

## Web parity references

- Web mini/full player composition under `apps/web/src/components` (transport + artwork + up-next)
  for control grouping; tablet two-column is an adaptation, not a pixel mirror.
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md`.

## Non-goals

- Player-integrated transcript chrome / seamless video reflow (Track 21 deferrals / Track 11 video).

## Verification

```bash
npm run mobile:ios -- --device "iPad Pro 13-inch (M4)"
```
