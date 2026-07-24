# 100-rn-mini-player-surface-target

**Master step:** 2.21
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- RN mini player registers `targetId=mini` via `attachVideoSurface` whenever its placeholder layout
  changes (mount, layout, keyboard inset).
- Transparent placeholder view measures to window coordinates and pushes rects to the bridge.
- Complements Track 11.3 (video placeholder UI) — this step owns the **registration path**.

## Architecture notes

- Measure with `measureInWindow` (or equivalent); convert consistently with native density rules.
- Do not mount `expo-video` / second Video.
- Share a small helper under `apps/mobile/src/playback/` or `components/player/` for rect publish.

## Edge cases

- Mini player hidden (no now-playing): detach or send zero rect / unregister per bridge contract.
- Keyboard open: remeasure and re-attach.
- Tablet split layout: still use window coords.

## Acceptance criteria

- Mini placeholder updates call `attachVideoSurface('mini', rect)` on layout changes.
- Audio-only: placeholder may remain but surface stays hidden (2.23).
- No engine `load`/`destroy` on layout updates.

## Web parity references

- [342-mini-player-video-placeholder](./342-mini-player-video-placeholder.md) (11.3)
- Mini player: `apps/mobile/src/components/player/MiniPlayer.tsx`

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 2.18; Track 11.1–11.2 mini UI (`done`)
