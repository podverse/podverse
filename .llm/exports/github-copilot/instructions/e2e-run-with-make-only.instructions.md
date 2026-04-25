---
description: "Run Podverse E2E via make targets only."
applyTo: "**"
---

# E2E Commands Must Use Make

For Podverse E2E verification commands, always use `make` targets from repo root.

## Required

- Use `make e2e_test_web_report_spec SPEC=...` for web specs.
- Use `make e2e_test_management_web_report_spec SPEC=...` for management-web specs.
- Use `make e2e_test_report_scoped WEB_SPEC=... MGMT_SPEC=...` for cross-app scoped runs.
- `SPEC`, `WEB_SPEC`, and `MGMT_SPEC` may be a single path or comma-delimited list.

## Prohibited

- Do not suggest direct Playwright commands (`npx playwright test ...`) for normal verification.
- Do not suggest `npm run test:e2e -w ...` for normal verification.

## Why

Make targets handle required test setup consistently (dependencies, seed, report output), reducing flaky failures caused by missing setup.
