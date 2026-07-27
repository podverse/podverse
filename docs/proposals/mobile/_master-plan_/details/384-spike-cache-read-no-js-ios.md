# 384-spike-cache-read-no-js-ios

**Master step:** 12.5
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- **Spike / proof:** after phone JS has written the native cache, iOS native code can **read**
  queue + downloads + library payloads with the JS runtime **not started** (app killed or never
  launched into RN after write).
- Deliver:
  1. A native read path (Swift helper from 12.2)
  2. A reproducible operator procedure (CarPlay Simulator preferred; if CarPlay entitlement is
     unavailable, use a minimal native debug dump — e.g. log payloads on cold launch of a tiny
     native entry or `xcrun simctl` + container inspect documented in a short checklist)
  3. A short results note under
     `apps/mobile/modules/podverse-media-engine/` (e.g. `NATIVE-CACHE-SPIKE-IOS.md`) with
     GO / NO-GO and limitations

## Architecture notes

- Full CarPlay `CPListTemplate` browse is **12.7–12.8** — this spike only proves **cache
  readability**, not polished car UI.
- Prefer CarPlay Simulator when entitlement exists; otherwise prove via App Group / container
  file read without Metro attached.
- Distinguishes “audio after kill” (Track 2 spike) from “browse data available with JS dead”.

## Edge cases

- Entitlement missing → document blocked CarPlay Simulator path; still require file-level proof
- Stale cache after uninstall/reinstall
- Schema mismatch → empty tree, no crash

## Acceptance criteria

- Written spike note with steps an operator can re-run
- Evidence that JSON was read by native code without JS (log excerpt or screenshot)
- Explicit list of what remains for 12.7+ (templates, now-playing bind)
- Update GO-NO-GO / engine README cross-links if needed

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [113-engine-spike-gate](/docs/proposals/mobile/_master-plan_/details/113-engine-spike-gate.md)
- [381-ios-native-cache-storage](/docs/proposals/mobile/_master-plan_/details/381-ios-native-cache-storage.md)

## Verification

```bash
# Operator — after implement, follow NATIVE-CACHE-SPIKE-IOS.md
test -f apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-IOS.md
```

## Depends on

- 12.1–12.4 — this phase
