# Plan 01 — ensure-devices.sh

Read and implement detail [073-e2e-device-isolation-matrix](/docs/proposals/mobile/_master-plan_/details/073-e2e-device-isolation-matrix.md).

## Work

1. Add `scripts/mobile/ensure-devices.sh` with constants:
   - Manual: `iPhone 17 Pro`, `Pixel_6_Pro_API_33`
   - E2E: `iPhone 17 Pro E2E`, `Pixel_6_Pro_API_33_e2e`
2. Support modes: `e2e` (boot both E2E), `manual-ios`, `manual-android`, `print-matrix`.
3. Create missing E2E iOS sim (same type/runtime as manual) and E2E Android AVD (clone manual).
4. Never fall back to manual device names for E2E mode.

## Done when

```bash
bash scripts/mobile/ensure-devices.sh print-matrix
test -x scripts/mobile/ensure-devices.sh
```
