# 086-android-exoplayer-audio

**Master step:** 2.7
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement Android Kotlin audio with Media3 **ExoPlayer** (single instance).
- Map bridge methods to ExoPlayer APIs for http(s) enclosures.
- No track-player; prefer androidx.media3 artifacts.

## Architecture notes (car foundation)

- Module holds one ExoPlayer; `MediaLibraryService` (2.8) keeps process alive and will host Auto.
- Prefer Media3 over legacy ExoPlayer 2 packages.
- Same ExoPlayer instance used by session callbacks and future Android Auto now-playing — no
  per-surface players.

## Edge cases

- Network errors → error event
- Audio focus loss → pause or duck (document choice)

## Acceptance criteria

- Step 2.7 complete per master plan
- Sample enclosure plays on emulator/device
- Single ExoPlayer instance shared with 2.8–2.9

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)

## Verification

```bash
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
