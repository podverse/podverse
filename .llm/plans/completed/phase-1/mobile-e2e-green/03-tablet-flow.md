# 03 — Run the tablet E2E flow

## Context

`apps/mobile/e2e/tablet.yaml` was added on this branch but has NOT been run yet. It is
excluded from `mobile:e2e:test:all` (phone matrix unchanged) and targets tablet E2E
devices. It rotates to landscape (`setOrientation: LANDSCAPE_LEFT`) and screenshots
`tablet-home` + `tablet-podcast-detail`.

## Devices (from scripts/mobile/ensure-devices.sh)

- E2E iOS tablet: `iPad Pro 13-inch (M4) E2E`
- E2E Android tablet: `Pixel_Tablet_API_33_e2e`

Create/boot if missing:

    bash scripts/mobile/ensure-devices.sh e2e

## Steps

1. Ensure the leave-running stack is up (Metro `mobile:dev:e2e`, E2E API `:4230`,
   test-assets `:2111`).
2. Install the app on the tablet E2E devices (own tabs):

       # Mobile iOS
       npm run mobile:e2e:ios:tablet
       # Mobile Android
       npm run mobile:e2e:android:tablet

3. Run the flow (Mobile Maestro):

       npm run mobile:e2e:test -- tablet

4. Open the report and confirm the two tablet screenshots render the split/tablet layout:

       open .artifacts/mobile-e2e-reports/latest/index.html

## Done when

- `tablet` passes on the iOS tablet and Android tablet slots.
- `tablet-home` and `tablet-podcast-detail` screenshots show the tablet layout
  (home grid multi-column; podcast detail split, `testID=podcast-detail-split`).

## PROGRESS (2026-08-04)

### Fixed (real app bug) — Android tablet GREEN

The first tablet run redboxed on **both** slots before `home-screen` rendered:

> The 'below-icon' label position for tab bar is only supported when 'tabBarPosition' is set to
> 'top' or 'bottom' when using the 'uikit' variant.

`TabScaffold` (`apps/mobile/src/navigation/index.tsx`) set
`tabBarLabelPosition: 'below-icon'` together with `tabBarPosition: 'left'` for the tablet rail.
`@react-navigation/bottom-tabs` v7 throws for that combo (verified in
`node_modules/@react-navigation/bottom-tabs/lib/module/views/BottomTabBar.js:139`). Fix: the rail
uses `tabBarLabelPosition: 'beside-icon'` (iPad-sidebar style; phone bottom bar unchanged). After
the fix **android-tablet passes (59s)** — the app renders the tablet layout, `tab-home`,
`podcast-detail-split`, and `podcast-detail-screen` all resolve.

### Remaining — iOS-tablet dev-client flake (harness, not app code)

`ios-tablet` is flaky at the Expo dev-client layer under `setOrientation: LANDSCAPE_LEFT`:
attempt 1 loads to `home-screen` then can't find `tab-home` (screenshot shows the dev launcher,
rotated); the retry then fails the `connect-dev-client` "Development servers" wait. Reboots do not
change it, and a manual `exp+podverse-next://…?url=…` connect leaves the launcher rotated without
auto-loading the bundle. This is iPad dev-client/orientation instability, not the app (Android
tablet + all 22 phone flows are green).

**Concrete lead:** `breakpoints.lg = 900` and `isTabletLayout = width >= lg`. iPad Pro 13" portrait
width ≈ 1032dp (**≥ 900 → tablet layout + split already active in portrait**), but the Pixel Tablet
E2E AVD is tuned to `lcd=1800x2880 density=320` ≈ **800dp portrait (< 900)**, so Android needs
`LANDSCAPE_LEFT` to cross `lg` while iOS does not. The `setOrientation` (needed only for Android)
is what destabilizes the iPad dev client. Likely fix for a focused pass: make orientation
platform-aware (skip on iOS, or boot the iPad E2E sim already in landscape), and/or add a
settle/reconnect after `setOrientation`. Do NOT just delete `setOrientation` — Android needs it.

## RESOLUTION (2026-08-04) — COMPLETE, iOS + Android tablet green

Both tablet slots pass (iOS 33s / Android 1m7s).

1. **App render crash (both slots).** `TabScaffold` set `tabBarLabelPosition: 'below-icon'` with
   `tabBarPosition: 'left'` for the tablet rail; `@react-navigation/bottom-tabs` v7 throws for that
   combo. Fix: `'beside-icon'` in `apps/mobile/src/navigation/index.tsx`.
2. **iOS-tablet dev-client orientation flake.** `setOrientation: LANDSCAPE_LEFT` rotated the iPad
   dev client mid-flow, causing the Expo launcher to reappear (`tab-home` gone). The iPad is
   ~1032dp in portrait (>= lg=900), so it already renders the left rail + split without rotating;
   only the ~800dp Pixel Tablet needs landscape. Fix: gate the rotation with `when: platform:
   Android` in `apps/mobile/e2e/tablet.yaml`. iOS runs portrait and still exercises the tablet
   layout — `ios-tablet/screenshots/tablet-podcast-detail.png` shows the split (left channel pane +
   right Episodes pane) with the left nav rail.
