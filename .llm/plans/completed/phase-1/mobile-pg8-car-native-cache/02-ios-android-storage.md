# 02 — iOS + Android durable storage (12.2–12.3)

**Cursor model:** Opus 4.8  
**Details:**
[381-ios-native-cache-storage](/docs/proposals/mobile/_master-plan_/phase-1/details/381-ios-native-cache-storage.md),
[382-android-native-cache-storage](/docs/proposals/mobile/_master-plan_/phase-1/details/382-android-native-cache-storage.md)

## Goal

Replace no-op native-cache writes with durable storage on both platforms, plus a native read
helper each side can use for spikes and later car UI.

## Do

1. Read details 381–382 and existing Swift/Kotlin stub implementations of the three write
   methods in `podverse-media-engine`.
2. **iOS:** persist JSON for all three payloads (App Group preferred; document fallback). Add
   Swift reader API.
3. **Android:** persist JSON readable by `PodverseMediaLibraryService` process. Add Kotlin
   reader API; update service stub comments.
4. Atomic write (temp + rename or equivalent); corrupt JSON → empty + log.
5. Document storage paths + reader entry points in engine README.
6. Mark **12.2**, **12.3** + Appendix C **381**, **382** + detail headers **done**.

## Do not

- Implement full CarPlay scene (12.7+) or full Auto browse tree (12.11+).
- Require CarPlay entitlement to land storage (use app container if needed; document migration).
- Break existing playback / video surface behavior.
- Run tests during agent work.

## Skills / rules

- **mobile-carplay-android-auto**, **mobile-playback**, **mobile-worktree-scope** (native under
  `modules/` / `ios` / `android`)

## Operator verify

```bash
rg -n 'writeQueueSnapshot|NativeCache' apps/mobile/modules/podverse-media-engine/ios
rg -n 'writeQueueSnapshot|NativeCache' apps/mobile/modules/podverse-media-engine/android
```
