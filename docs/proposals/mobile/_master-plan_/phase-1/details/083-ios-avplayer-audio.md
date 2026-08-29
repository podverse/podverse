# 083-ios-avplayer-audio

**Master step:** 2.4
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement iOS Swift audio playback with a **single** `AVPlayer` for enclosures (http/https).
- Wire module methods for load/play/pause/seek/rate/position/duration/destroy.
- Audio-only for this spike (no video layer yet).

## Architecture notes (car foundation)

- One `AVPlayer` / `AVPlayerItem` lifecycle owned by the module (process-wide singleton).
- Replace item on `load`; do not create parallel players.
- Observe status / time for events (2.10).
- Expose a documented native accessor (e.g. shared engine holder) so a future CarPlay scene can bind
  now-playing to **this** instance without starting JS (12.9). Do not require the RN bridge to be
  alive for that future binding.

## Edge cases

- Invalid URL → error event, no crash
- Seek beyond duration → clamp
- Rapid load while playing → cancel prior item cleanly

## Acceptance criteria

- Step 2.4 complete per master plan
- Can play a sample remote MP3/M4A on simulator/device
- Single AVPlayer instance asserted in code comments / structure
- Documented singleton / shared accessor for future CarPlay binding

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
# Manual: invoke bridge load+play with sample enclosure URL
```
