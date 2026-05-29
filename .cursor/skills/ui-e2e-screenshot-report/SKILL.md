---
name: ui-e2e-screenshot-report
description: After Next.js, React, or shared UI changes, run a targeted make E2E screenshot report and surface the report path for operator review.
version: 1.0.0
---

# UI Change E2E Screenshot Report

Use this skill when you modify **visual or interactive UI** in:

- `apps/web/src/**`
- `apps/management-web/src/**`
- `packages/ui/src/**` (when behavior or layout affects web or management-web)

## Required agent behavior (UI changes)

Unlike API-only work, **do run** a targeted screenshot report before finishing:

1. Pick the **narrowest** spec that covers the changed surface (add or update the spec when behavior changed; see **e2e-page-tests**).
2. Run the matching make target from repo root via `./scripts/nix/with-env` when in the agent sandbox.
3. After the run completes, **tell the operator where to review screenshots**:
   - Primary: `.artifacts/e2e-reports/latest/web/index.html` or `.artifacts/e2e-reports/latest/management-web/index.html`
   - Also give the concrete timestamped path printed by make (e.g. `.artifacts/e2e-reports/20260528-143022/web/index.html`).
4. If tests fail, fix or report the failure; do not claim success without a passing run.

## Commands

- Web: `make e2e_test_web_report_spec SPEC=e2e/<spec>.spec.ts`
- Management-web: `make e2e_test_management_web_report_spec SPEC=e2e/<spec>.spec.ts`
- Both apps: `make e2e_test_report_scoped WEB_SPEC=e2e/<web>.spec.ts MGMT_SPEC=e2e/<mgmt>.spec.ts`

Use `SPEC` paths relative to the app `e2e/` folder (e.g. `e2e/cookie-consent-enabled.spec.ts`), not `apps/web/e2e/...`, unless your Makefile target docs say otherwise.

Do **not** use `npx playwright test` directly; make handles seed, deps, and report output.

## API gate

Do **not** add `E2E_API_GATE_MODE=on` unless the change also requires API integration tests.

## Response format

End the implementation response with:

1. A short note that the report was generated (pass/fail).
2. A markdown link or path to `index.html` under `.artifacts/e2e-reports/latest/`.
3. A fenced `bash` block with the exact command so the operator can re-run.

## When not to run

- API-only, workers, ORM, or config-only changes with no UI impact: follow **response-ending-make-verify** (instruct only).
- Documentation-only edits under `docs/` with no component changes.
