# 04 — Spikes: cache read with JS dead (12.5–12.6)

**Cursor model:** Opus 4.8  
**Details:**
[384-spike-cache-read-no-js-ios](/docs/proposals/mobile/_master-plan_/details/384-spike-cache-read-no-js-ios.md),
[385-spike-cache-read-no-js-android](/docs/proposals/mobile/_master-plan_/details/385-spike-cache-read-no-js-android.md)

## Goal

Prove native code can read the durable cache without JS on iOS and Android; document operator
procedures and GO/NO-GO.

## Do

1. Read details 384–385.
2. Add minimal native logging / debug dump using the readers from 12.2–12.3 (CarPlay Simulator
   or container inspect on iOS; DHU or force-stop + service log on Android).
3. Write:
   - `apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-IOS.md`
   - `apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-ANDROID.md`
4. Cross-link from engine README / `GO-NO-GO.md` (12.5–12.6 rows).
5. Mark **12.5**, **12.6** + Appendix C **384**, **385** + detail headers **done**.
6. Archive this plan set to `.llm/plans/completed/mobile-pg8-car-native-cache/` per
   **plan-completion**.
7. Update master plan “Current status / next up” to point at follow-on car surfaces (12.7+).

## Do not

- Ship full CarPlay browse UI or Auto MediaItem tree (12.7–12.15) in this prompt.
- Block the spike forever if CarPlay entitlement / DHU is missing — use documented alternate
  proof, note limitation in spike MD.
- Run Maestro/Playwright as a substitute for native read proof.
- Run tests during agent work.

## Skills / rules

- **mobile-carplay-android-auto**, **plan-completion**

## Operator verify

```bash
test -f apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-IOS.md
test -f apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-ANDROID.md
# Then follow each spike doc on device/simulator
```
