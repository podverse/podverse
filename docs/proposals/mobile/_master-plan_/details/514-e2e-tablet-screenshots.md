# 514-e2e-tablet-screenshots

**Master step:** 18.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Add a Maestro screenshot flow that captures Home and podcast detail at a **tablet viewport** so the
responsive layouts (511–513) are visually verified in the mobile E2E report.

1. Add a focused flow under `apps/mobile/e2e/` (e.g. `e2e/tablet.yaml` or a `tablet` area) that:
   - Launches the app, asserts `home-screen`, takes a screenshot (`tablet-home`).
   - Navigates into a seeded podcast, asserts `podcast-detail-split` (tablet two-pane), screenshots
     (`tablet-podcast-detail`).
2. Wire a **tablet device** into the E2E device provisioning (`scripts/mobile/ensure-devices.sh`
   and the E2E run scripts) — iOS iPad simulator + an Android tablet AVD — as an **opt-in** target
   (env flag / area), not the default phone matrix. Reuse the existing report slot pattern from
   **mobile-e2e-screenshots**.
3. Follow **mobile-maestro-timeouts** for waits; assert a real element before each screenshot
   (**e2e-screenshot-verified-element**).

## Acceptance criteria

- `npm run mobile:e2e:test -- tablet` produces `tablet-home` and `tablet-podcast-detail` shots in
  the report slot.
- Tablet target is opt-in; the default phone E2E matrix is unaffected.
- Screenshots show multi-column Home and the two-pane podcast detail.

## Web parity references

- None (E2E harness step). Report/slot conventions: `.cursor/skills/mobile-e2e-screenshots/SKILL.md`.

## Verification

```bash
npm run mobile:e2e:test -- tablet
open .artifacts/mobile-e2e-reports/latest/ios-tablet/index.html
```
