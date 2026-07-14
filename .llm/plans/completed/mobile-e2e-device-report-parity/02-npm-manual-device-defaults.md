# Plan 02 — npm manual device defaults

## Work

1. Update `scripts/mobile/run-expo-macos.sh` to append manual `--device` when omitted.
2. Update `.cursor/rules/mobile-ios-simulator.mdc` for dual matrix (manual vs E2E).
3. Update `mobile-expo-monorepo` skill and `APPS-MOBILE.md` device tables.

## Done when

```bash
rg -n 'iPhone 17 Pro E2E|Pixel_6_Pro_API_33_e2e|MANUAL' scripts/mobile/run-expo-macos.sh .cursor/rules/mobile-ios-simulator.mdc apps/mobile/APPS-MOBILE.md
```
