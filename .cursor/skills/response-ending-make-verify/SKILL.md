---
name: response-ending-make-verify
description: End implementation responses with scoped make-based report commands for web and management-web verification.
version: 1.1.0
---

# Response-Ending Make Verification

Use this skill when answering implementation requests in this repo.

## UI changes: run screenshot report

When the change touches **Next.js / React / shared UI** (`apps/web/src`, `apps/management-web/src`, or `packages/ui/src` consumed by those apps), follow **ui-e2e-screenshot-report**:

- **Run** the targeted `make e2e_test_*_report_spec` (or scoped report) before finishing.
- **Display** the report path (`.artifacts/e2e-reports/latest/.../index.html`) so the operator can review step screenshots.

## Non-UI changes: instruct only

For API, workers, packages without UI impact, and other non-visual work:

- **Do not run** test or verification commands during agent or plan work unless the user explicitly asks.
- **Instruct the user** to run commands after your work is done. Provide exact command(s) in a fenced `bash` block.

## Required response behavior

1. End with verification guidance: either a completed report path (UI) or runnable make commands (non-UI).
2. Do not suggest direct Playwright execution (`npx playwright test ...`) for E2E verification; use the `make` wrappers so seed/setup is included.
3. **E2E-affected changes (mandatory):** If the change affects E2E tests, include the **EXACT** command(s) needed to verify—even when you already ran them for UI work.
4. Prefer feature-scoped screenshot report commands over full-suite commands.

## Command selection

- Web-only feature: `make e2e_test_web_report_spec SPEC=e2e/<web-spec>.spec.ts`
- Management-web-only feature: `make e2e_test_management_web_report_spec SPEC=e2e/<mgmt-spec>.spec.ts`
- Cross-app feature: `make e2e_test_report_scoped WEB_SPEC=e2e/<web-spec>.spec.ts MGMT_SPEC=e2e/<mgmt-spec>.spec.ts`
- Broad regression: `make e2e_test_report`
- API-only change: `npm run test:e2e:api`

## API gate

E2E commands **do not run** API integration tests by default. Only add API verification commands when the change affected API code.

## Spec variables

`SPEC`, `WEB_SPEC`, `MGMT_SPEC` support comma-separated values.
