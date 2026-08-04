# 447-e2e-push-routing-stub

**Master step:** 14.8
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- E2E flow (where the harness allows) that simulates a notification **open** and asserts the app
  routes to the correct screen — validating 443 tap routing without a live push server.
- Since Maestro cannot deliver a real push, drive the open path via a **deep link that mimics the
  notification payload target** (custom scheme), reusing 455's deep-link flow, OR a debug/E2E-only
  "simulate notification open" hook.
- Screenshot the target screen into the mobile E2E report.

## Acceptance criteria

- Flow triggers the notification-open code path (or its deep-link equivalent) and lands on the
  expected screen (assert stable testID).
- Screenshot captured (ios-phone + android-phone slots).
- Hermetic (E2E-safe `id_text`); no live Firebase/UnifiedPush dependency.

## Web parity references

- Detail 443 (tap routing), 455 (deep-link E2E), 452/453 (path map + cold start).
- `apps/mobile/e2e/HOW-TO-RUN.md`; skills **mobile-e2e-screenshots**, **mobile-maestro-timeouts**.

## Verification

```bash
ls apps/mobile/e2e/push-*.yaml 2>/dev/null || ls apps/mobile/e2e/deep-link-*.yaml
npm run mobile:e2e:test -- push
```
