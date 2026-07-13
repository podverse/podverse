# 088-android-media-session-controls

**Master step:** 2.9
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Wire Media3 `MediaSession` (owned by the `MediaLibraryService` from 2.8) for lock-screen / BT
  play-pause-seek.
- Metadata placeholders acceptable for spike.

## Architecture notes (car foundation)

- Session callbacks must call into the **same ExoPlayer** owned by the engine.
- Do not create a second player or a second MediaSession for “car later.”
- Android Auto now-playing and transport controls will use this same session (Track 12); keep
  callback ownership centralized in the engine module.

## Acceptance criteria

- Step 2.9 complete per master plan
- Lock screen / headset controls affect playback
- Same engine instance as 2.7–2.8
- Single MediaSession associated with the library service

## Web parity references

- [mobile-playback](/.cursor/skills/mobile-playback/SKILL.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)

## Verification

```bash
# Manual: lock screen / media notification controls
```
