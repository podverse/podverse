# Mobile E2E device isolation + report parity

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 5.14–5.16
**Detail IDs:** 073–075

## Goal

Separate **manual** vs **automated** device slots (same app id, same OS/API family) so Maestro
`clearState` does not wipe day-to-day sim sessions. Auto-boot both E2E devices from Make. Emit a
web-parity step/screenshot HTML report under `.artifacts/mobile-e2e-reports/latest/`.

## Locked device matrix

| Role | iOS | Android |
| ---- | --- | ------- |
| Manual (dev) | `"iPhone 17 Pro"` | `Pixel_6_Pro_API_33` |
| Automated (E2E) | `"iPhone 17 Pro E2E"` | `Pixel_6_Pro_API_33_e2e` |

App id remains `com.podverse.app.next` (no second bundle id).

## Outputs

- `scripts/mobile/ensure-devices.sh`
- `scripts/mobile/e2e-html-report.mjs`
- Make `mobile_e2e_*` auto-boot + per-platform Maestro runs
- `run-expo-macos.sh` defaults to manual devices
- Abcmemory / APPS-MOBILE / CI stub updates
- Details 073–075 + master-plan steps 5.14–5.16

## Out of scope

- Second store identity / bundle id
- Different OS major versions for manual vs E2E
- Detox
