# 07 — E2E: membership gate + renew nav + V4V

**Cursor model:** Codex 5.3
**Master step:** Track 19.8 (567) — E2E membership gate (+ V4V placeholder).
**Ship bar:** Maestro flows prove the gate modal, renew navigation to the Membership screen, the
context-aware CTA, and the V4V placeholder — with screenshots in the report.

## Why

The gate + Membership screen + V4V are user-facing and must be regression-protected like other mobile
areas (see **mobile-e2e-screenshots**).

## Scope (add Maestro flows under `apps/mobile/e2e/`)

1. **`membership-gate.yaml`** (API-backed): as a **non-member / expired** seed account, attempt a
   member-only action (e.g. subscribe or create playlist) → assert `premium-gate-modal` visible →
   `takeScreenshot` → tap `premium-gate-renew` → assert `more-membership-screen` visible → screenshot.
   Assert the auth-based CTA label: a logged-in expired seed shows **"Renew"** (the modal's usual case).
   For **"Sign Up"**, assert it on the Membership screen (04) opened logged-out from the More menu —
   not via the gate modal, since gated actions require auth (401 login prompt), not the premium modal.
   - Use an existing expired/non-member E2E seed if available; otherwise add one (mock/seed entitlement
     per 19.8). Keep it deterministic; gate the flow on `flow_needs_test_assets` if it hits real API.
2. **`membership-expired-banner.yaml`** (optional, if a stable expired seed exists): assert
   `membership-expired-banner` visible on a core screen for an expired account.
3. **`v4v.yaml`** (UI-only): open the full player, tap `full-player-v4v`, assert `v4v-info-screen`.
   (Can fold into the existing `player`/`tablet` flow instead of a new file if cleaner.)
   - **Enable the flag:** the button is **hidden by default** (`EXPO_PUBLIC_MOBILE_V4V_ENABLED` unset).
     The E2E build must set `EXPO_PUBLIC_MOBILE_V4V_ENABLED=1` so the button renders — add it to the
     mobile E2E env used by `mobile:e2e:*` (the same place `EXPO_PUBLIC_MOBILE_E2E`/API base are set).
     Do not flip the code default (store-compliance doc 359 — hidden by default is intentional).
4. **Register** any new flow in `scripts/mobile/e2e-test.sh` (`flow_needs_test_assets` where API-backed)
   and note requirements in `apps/mobile/e2e/HOW-TO-RUN.md`.

## Guards

- Follow **mobile-maestro-timeouts** (use `TIMEOUT_*` vars, `extendedWaitUntil`) and
  **mobile-e2e-screenshots** (screenshot the verified element).
- Handle the iOS open-dialog / platform gating patterns already used in the suite.
- Keep flows deterministic; do not depend on live network content.

## Acceptance

- `membership-gate` flow passes on iOS + Android: modal → renew → Membership screen, with screenshots.
- V4V flow passes: button → placeholder.
- New flows registered in the runner + HOW-TO-RUN.

## Verification (operator)

**Mobile Metro** + **Mobile iOS/Android** (+ **Mobile E2E API** for API-backed) must be up
(see HOW-TO-RUN.md). Then, **Mobile Maestro**:

```bash
npm run mobile:e2e:test -- membership-gate
npm run mobile:e2e:test -- v4v
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
