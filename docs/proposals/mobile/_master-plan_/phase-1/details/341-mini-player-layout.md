# 341-mini-player-layout

**Master step:** 11.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Mini player fixed above tab bar; respects safe area and keyboard inset.
- Hidden when nothing is now-playing.

## File paths

- Tab navigator + MiniPlayerSlot layout in `apps/mobile/src/navigation/index.tsx`

## Acceptance criteria

- Does not cover tab bar labels; uses safe-area bottom inset correctly
- Keyboard open does not permanently mis-position after dismiss
- Hidden when queue has no now-playing

## Web parity references

- Mobile tab navigator layout (Track 7)
- RN SafeAreaProvider / KeyboardAvoiding patterns already in app

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Implementation notes

- Rendered inside the phone tab bar column above `BottomTabBar` (so the tab bar below owns the
  safe-area bottom inset and labels stay uncovered); tablet layout unchanged (no mini player).
- Hidden when `activeTarget === null` (nothing now-playing). `tab-switch-playback.yaml` now starts
  playback before asserting the mini player persists across tabs.

## Depends on

- 11.1
