# Plan 03 — Make mobile_e2e auto-boot

Read detail [074-e2e-make-autoboot-both-platforms](/docs/proposals/mobile/_master-plan_/details/074-e2e-make-autoboot-both-platforms.md).

## Work

1. Call `ensure-devices.sh e2e` from `mobile_e2e_test_report_spec`.
2. Resolve E2E iOS UDID / Android serial; run Maestro sequentially per platform into `ios/` and `android/` report subdirs.
3. Print install/Metro hints targeting **E2E** device names only.
4. Best-effort Metro start if port free; never target manual devices from Make.

## Done when

```bash
rg -n 'ensure-devices|iPhone 17 Pro E2E|Pixel_6_Pro_API_33_e2e' makefiles/local/Makefile.local.e2e.mk
```
