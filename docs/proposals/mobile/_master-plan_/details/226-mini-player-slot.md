# 226-mini-player-slot

**Master step:** 7.7
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Persistent mini player slot **above** the tab bar, visible on all tabs when now-playing exists
  (stub when Track 10/11 not ready: empty slot or hidden until `hasNowPlaying`).
- Slot registers layout rect for future `targetId=mini` video surface (Track 2.21) — expose a
  measurable container even if engine attach is deferred.
- Do **not** remount the media engine when switching tabs.

## Architecture notes

- Render mini player as a sibling above `Tab.Navigator` (absolute/flex column), not inside each tab.
- Engine lifetime is app-scoped (Track 2), not screen-scoped.

## Acceptance criteria

- Tab switches leave mini slot mounted
- Placeholder UI themed; `testID` e.g. `mini-player`
- No dependency on react-native-track-player

## Web parity references

- Web mini player chrome in layout
- **mobile-playback** skill; Track 2 surface targets

## Verification

```bash
# Manual: switch tabs with stub now-playing set — slot remains
npm run mobile:ios -- --device "iPhone 17 Pro"
```
