# 050-ios-background-audio-plist

**Master step:** 3.11
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Configure iOS `UIBackgroundModes` audio placeholder for future media engine (Track 2).
- Apply via Expo config (`ios.infoPlist`) or config plugin so prebuild regenerates correctly.
- Avoid enabling unrelated background modes in hello-world phase.
- Document that this is a **placeholder** until `podverse-media-engine` lands.

## Acceptance criteria

- Step 3.11 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Generated iOS Info.plist includes `audio` under `UIBackgroundModes`
- Setting survives `expo prebuild` without manual Xcode edits
- Config source lives in `app.config.ts` / Expo plugins (not hand-edited plist only)
- No CarPlay entitlement or scene config in this step (later tracks)

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)

## Verification

```bash
grep -q UIBackgroundModes apps/mobile/app.config.ts apps/mobile/app.json 2>/dev/null
grep -q audio apps/mobile/app.config.ts apps/mobile/app.json 2>/dev/null
```
