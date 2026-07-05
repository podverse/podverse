# 009-rule-mobile-car-native

**Master step:** 0.9
**Model (author + implement):** Opus 4.8
**Status:** ready

## Scope

Add `.cursor/rules/mobile-carplay-android-auto.mdc` pointing to native cache contract and app-closed requirement.

## Acceptance criteria

- Rule explains CarPlay/Android Auto are native-only browse trees
- References native cache schema (Track 12)
- No react-native-track-player; shared engine instance

## Web parity references

- [docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)

## Verification

```bash
test -f .cursor/rules/mobile-carplay-android-auto.mdc
grep -q "native cache" .cursor/rules/mobile-carplay-android-auto.mdc
```
