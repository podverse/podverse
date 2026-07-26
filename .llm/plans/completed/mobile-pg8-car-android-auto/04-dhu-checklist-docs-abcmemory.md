# 04 — DHU checklist + Play Console declaration + QA gate + abcmemory (12.16, 12.17, 12.19, 12.20)

**Cursor model:** Auto (docs) / Codex 5.3 (abcmemory rule)
**Details to author (Android portions):**
[395-car-entitlements-declarations](/docs/proposals/mobile/_master-plan_/details/395-car-entitlements-declarations.md),
[396-dhu-test-checklist](/docs/proposals/mobile/_master-plan_/details/396-dhu-test-checklist.md),
[398-car-manual-qa-gate](/docs/proposals/mobile/_master-plan_/details/398-car-manual-qa-gate.md),
[399-abcmemory-car-native-only](/docs/proposals/mobile/_master-plan_/details/399-abcmemory-car-native-only.md)

## Goal

Ship the operator-facing proof + declaration docs for Android Auto and lock the "car is native-only"
guidance into abcmemory. This is the acceptance gate for the Android Auto browse+play slice — the
agent writes the checklists; the operator runs DHU and submits the Play Console declaration.

## Do

1. **12.16 (Android portion) — Play Console declaration checklist (operator).** Author detail 395's
   Android section + a short doc under the engine module (e.g.
   `apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md`): the `<automotiveApp>`
   XML / `com.google.android.gms.car.application` metadata requirements, "Android Auto" app category
   declaration in Play Console, media-app quality guidelines link, and what the operator submits.
   Mark clearly as **operator/portal** steps. (iOS CarPlay entitlement is a separate later slice.)
2. **12.17 — DHU manual checklist.** Author detail 396 + `ANDROID-AUTO-DHU-CHECKLIST.md`: install
   DHU, `adb shell am force-stop com.podverse.app.next`, connect DHU, browse **Library** +
   **Downloads**, play an offline item and a streamed item with the phone app **never opened**,
   confirm now-playing + skip. Include the force-stop + `adb logcat -s PodverseNativeCache:I`
   fallback when DHU is unavailable. Cross-link `NATIVE-CACHE-SPIKE-ANDROID.md` and `GO-NO-GO.md`.
3. **12.19 (Android portion) — manual QA gate.** Author detail 398's Android section: add the DHU
   browse+play gate to the release runbook (car E2E is not fully automatable). Keep it a pointer to
   the DHU checklist; do not duplicate steps.
4. **12.20 — abcmemory rule.** Update
   [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc) (or a small new
   note) to state the Android Auto browse tree + play are implemented natively from the cache
   (12.11–12.15), reinforce "never JS/track-player car browse", and link the DHU checklist. Author
   detail 399. This is an **abcmemory** change — commit only `.cursor/**` for it.
5. **Statuses:** mark **12.16 (Android)**, **12.17**, **12.19 (Android)**, **12.20** + Appendix C
   **395/396/398/399** + detail headers **done** (note iOS portions of 395/398 remain _TBD_).
6. Update `GO-NO-GO.md` with an Android Auto browse+play row (✅ pending operator DHU).
7. **Archive** this plan set to `.llm/plans/completed/mobile-pg8-car-android-auto/` per
   **plan-completion**; update `LLM-PLANS-ACTIVE.md` + master-plan "Current status / next up" to
   point at **iOS CarPlay (12.7–12.10)** as next up.

## Do not

- Do not mark iOS CarPlay steps (12.7–12.10 / 12.18) or their detail iOS portions done.
- Do not claim DHU proof as done in the agent run — it is operator acceptance (leave evidence blanks).
- Do not run Maestro/DHU as agent verification, and do not run tests during agent work.

## Skills / rules

- **plan-completion**, **mobile-carplay-android-auto**, **abcmemory**, **llm-cursor-source**

## Operator verify (cumulative for the whole slice — no tests run by agent)

```bash
test -f apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md
test -f apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md
rg -n 'onGetChildren|onAddMediaItems|onConnect' apps/mobile/modules/podverse-media-engine/android
npm run mobile:prebuild
npm run mobile:android -- --device Pixel_6_Pro_API_33
# Then follow ANDROID-AUTO-DHU-CHECKLIST.md on DHU with the app force-stopped.
```
