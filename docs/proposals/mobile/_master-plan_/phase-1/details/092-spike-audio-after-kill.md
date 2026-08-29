# 092-spike-audio-after-kill

**Master step:** 2.13
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Spike: force-stop / swipe-away app and document whether audio continues (often **no** on iOS;
  Android depends on service + OEM).
- Document OS policy limits honestly for CarPlay/Android Auto planning (Track 12 needs native cache
  when JS is dead — playback continuity after kill is not required for go/no-go if background works).

## Spike outcomes

- iOS: force-quit stops audio (expected).
- Android: continuity after swipe-away not claimed for GO (OEM / task-removed dependent).
- Distinction documented: audio-after-kill vs car browse from native cache with JS dead (12.5–12.6).

## Acceptance criteria

- Step 2.13 complete per master plan
- Limits documented in module README
- No false claim that kill-survival works on both platforms
- Notes distinguish “audio after kill” vs “car browse from native cache with JS dead” (12.5–12.6)

## Web parity references

- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)

## Verification

```bash
# Manual: play → force stop → observe (operator; completed for GO)
```
