# 073-e2e-device-isolation-matrix

**Master step:** 5.14
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Lock dual device slots: manual (`iPhone 17 Pro` / `Pixel_6_Pro_API_33`) vs E2E
  (`iPhone 17 Pro E2E` / `Pixel_6_Pro_API_33_e2e`).
- Same app id `com.podverse.app.next`; no second bundle id.
- Helper `scripts/mobile/ensure-devices.sh` create/boot E2E devices without touching manual.

## Acceptance criteria

- Matrix documented in APPS-MOBILE + mobile-ios-simulator rule
- Script can print matrix and ensure E2E devices exist/boot
- Future E2E Make targets never default to manual device names

## Verification

```bash
bash scripts/mobile/ensure-devices.sh print-matrix
rg -n 'iPhone 17 Pro E2E|Pixel_6_Pro_API_33_e2e' apps/mobile/APPS-MOBILE.md .cursor/rules/mobile-ios-simulator.mdc
```
