---
name: response-ending-make-verify
description: End implementation responses with scoped make-based report commands for web and management-web verification.
version: 1.1.0
---

# Response-Ending Make Verification

Use this skill when answering implementation requests in this repo.

## Do not run tests during agent or plan work

- **Never run** test or verification commands as part of agent or plan implementation unless the user explicitly asks.
- **Only instruct the operator** to run those commands after your work is done. Provide exact command(s) in a fenced `bash` block.
- For **UI changes** (`apps/web/src`, `apps/management-web/src`, or `packages/ui/src` consumed by those apps), follow **ui-e2e-screenshot-report** to pick the narrowest `make e2e_test_*_report_spec` command and tell the operator where reports appear (`.artifacts/e2e-reports/latest/.../index.html`).

## Required response behavior

1. End with runnable verification commands in a fenced `bash` block.
2. Do not suggest direct Playwright execution (`npx playwright test ...`) for E2E verification; use the `make` wrappers so seed/setup is included.
3. **E2E-affected changes (mandatory):** If the change affects E2E tests, include the **EXACT** command(s) needed to verify.
4. Prefer feature-scoped screenshot report commands over full-suite commands.

## Command selection

- Web-only feature: `make e2e_test_web_report_spec SPEC=e2e/<web-spec>.spec.ts`
- Management-web-only feature: `make e2e_test_management_web_report_spec SPEC=e2e/<mgmt-spec>.spec.ts`
- Cross-app feature: `make e2e_test_report_scoped WEB_SPEC=e2e/<web-spec>.spec.ts MGMT_SPEC=e2e/<mgmt-spec>.spec.ts`
- Broad regression: `make e2e_test_report`
- API-only change: `npm run test:e2e:api`

## API gate

E2E commands **do not run** API integration tests by default. Only add API verification commands when the change affected API code.

## Unit test commands (repo root)

Follow **commands-from-monorepo-root** rule:

- **Full unit tier:** `npm run test:unit` (root orchestrator; do not use with `-w`)
- **Scoped workspace:** `npm run test -w <workspace>` — verify the workspace `package.json` defines `test`
- **Several workspaces:** `node scripts/ci/run-workspaces.mjs --script test --workspaces <paths…>`

**Never** suggest `npm run test:unit -w <workspace>` — that script name exists only at repo root.

## Copy-pasta final prompt (cumulative verification)

When you complete the **last** step in a plan set (`COPY-PASTA.md` / `00-EXECUTION-ORDER.md`):

1. Assume the operator ran every COPY-PASTA prompt back-to-back **without** running tests until this final step.
2. Collect **Verification** sections from each numbered plan file in the set.
3. Merge into one fenced `bash` block for the operator: `npm run build:packages`, `npm run lint`, `npm run test:unit` (or scoped `npm run test -w <workspace>` when the phase is narrow), `npm run test:e2e:api`, scoped `make e2e_test_*_report_spec`, etc., as applicable to the set.
4. Deduplicate commands; order: build/lint → unit → API → E2E (scoped before full suite).
5. For intermediate COPY-PASTA steps (not the last), end with verification commands for **that step only**.

## Spec variables

`SPEC`, `WEB_SPEC`, `MGMT_SPEC` support comma-separated values.
