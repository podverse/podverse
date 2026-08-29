# 084-ios-audio-session-lifecycle

**Master step:** 2.5
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Configure `AVAudioSession` category `.playback` with background capability already declared in
  Info.plist (Track 3 placeholder).
- Handle interruptions (phone call) and route changes; resume policy documented.

## Architecture notes

- Activate session on play; deactivate on destroy / idle per Apple guidance.
- Background mode must remain `audio` only for this spike (CarPlay scene config is Track **12.7**).
- Session ownership stays native so car/background playback does not depend on JS being alive.

## Edge cases

- Interruption began/ended
- Headphones unplug → pause (match typical podcast UX)

## Acceptance criteria

- Step 2.5 complete per master plan
- Audio continues when app backgrounds (validated in 2.12)
- Interruption handlers registered

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md) (session ownership context)

## Verification

```bash
# Manual: play audio, background app, confirm continued playback
```
