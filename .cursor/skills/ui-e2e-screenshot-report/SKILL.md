---
name: ui-e2e-screenshot-report
description: After Next.js, React, or shared UI changes, instruct the operator to run a targeted make E2E screenshot report and where to review it.
version: 1.0.0
---

# UI Change E2E Screenshot Report

Use this skill when you modify **visual or interactive UI** in:

- `apps/web/src/**`
- `apps/management-web/src/**`
- `packages/ui/src/**` (when behavior or layout affects web or management-web)

## Operator verification (UI changes)

Agents do **not** run E2E during implementation. Instruct the operator to verify UI work with a targeted screenshot report:

1. Pick the **narrowest** spec that covers the changed surface (add or update the spec when behavior changed; see **e2e-page-tests**).
2. End the response with the matching make target in a fenced `bash` block (repo root).
3. Tell the operator where to review screenshots **after they run the command**:
   - Primary: `.artifacts/e2e-reports/latest/web/index.html` or `.artifacts/e2e-reports/latest/management-web/index.html`
   - Also mention the concrete timestamped path printed by make (e.g. `.artifacts/e2e-reports/20260528-143022/web/index.html`).

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

1. A fenced `bash` block with the exact command for the operator to run.
2. The expected report path under `.artifacts/e2e-reports/latest/`.

## When this skill does not apply

- API-only, workers, ORM, or config-only changes with no UI impact: follow **response-ending-make-verify** (instruct only).
- Documentation-only edits under `docs/` with no component changes.
