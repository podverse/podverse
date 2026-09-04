---
name: response-ending-make-verify
description: End implementation responses with scoped verification commands — web/management-web make screenshot reports, or mobile npm Maestro slot reports. Use after feature work so the operator can review results in HTML reports.
version: 1.2.0
---

# Response-Ending Verification Commands

Use this skill when answering implementation requests in this repo.

## Do not run tests during agent or plan work

- **Never run** test or verification commands as part of agent or plan implementation unless the user explicitly asks.
- **Only instruct the operator** to run those commands after your work is done. Provide exact command(s) in a fenced `bash` block.
- For **web UI changes** (`apps/web/src`, `apps/management-web/src`, or `packages/ui/src` consumed by those apps), follow **ui-e2e-screenshot-report** to pick the narrowest `make e2e_test_*_report_spec` command and tell the operator to open the hub at `.artifacts/e2e-reports/latest/index.html` (slot cards open reports in new tabs).
- For **mobile changes** (`apps/mobile/src/**`, `apps/mobile/e2e/**`), follow **mobile-e2e-screenshots**: end with the **most focused** `npm run mobile:e2e:test -- <area>` (or default smoke when that is the right scope) and report paths under `.artifacts/mobile-e2e-reports/latest/` (`failures.json` + slot summaries). Do **not** put leave-running `mobile:dev`, `mobile:dev:e2e`, or `mobile:e2e:api` in the same fenced verification `bash` block as Maestro — those block the shell. Name leave-running tabs from [`.vscode/terminals.json`](/.vscode/terminals.json) (**Mobile Metro**, **Mobile E2E API**) per **vscode-terminals-commands**.

## Required response behavior

1. End with runnable verification commands in a fenced `bash` block.
2. Do not suggest direct Playwright execution (`npx playwright test ...`) for web E2E; use the `make` wrappers so seed/setup is included.
3. Do not suggest bare Maestro CLI for mobile E2E; use `npm run mobile:e2e:test` (npm-first workflow).
4. **E2E-affected changes (mandatory):** If the change affects E2E tests (web or mobile), include the **EXACT** focused command(s) needed to verify.
5. Prefer feature-scoped screenshot report commands over full-suite commands.

## Command selection

- Web-only feature: `make e2e_test_web_report_spec SPEC=e2e/<web-spec>.spec.ts`
- Management-web-only feature: `make e2e_test_management_web_report_spec SPEC=e2e/<mgmt-spec>.spec.ts`
- Cross-app feature: `make e2e_test_report_scoped WEB_SPEC=e2e/<web-spec>.spec.ts MGMT_SPEC=e2e/<mgmt-spec>.spec.ts`
- Mobile feature: `npm run mobile:e2e:test -- <area>` mapping to `apps/mobile/e2e/<area>.yaml`
- Broad web regression: `make e2e_test_report`
- API-only change: `npm run test:e2e:api`

Mobile operators also need Metro + E2E installs in other tabs when not already running — name
**Mobile Metro** / **Mobile iOS** / **Mobile Android** / **Mobile E2E API** (see
**vscode-terminals-commands**) and point at [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md).

Do not default to an `all` suite. Use a full suite only when the change is structural, cross-cutting,
changes shared E2E infrastructure or fixtures, or cannot be meaningfully covered by focused flows.

## API gate

Web E2E commands **do not run** API integration tests by default. Only add API verification commands when the change affected API code.

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
3. Merge into one fenced `bash` block for the operator: `npm run build:packages`, `npm run lint`, `npm run test:unit` (or scoped `npm run test -w <workspace>` when the phase is narrow), `npm run test:e2e:api`, scoped `make e2e_test_*_report_spec`, scoped `npm run mobile:e2e:test -- <area>`, etc., as applicable to the set. For mobile API-backed sets, keep leave-running Metro/API out of that block (HOW-TO-RUN prose / comments only).
4. Deduplicate commands; order: build/lint → unit → API → E2E web → E2E mobile (scoped before full suite).
5. For intermediate COPY-PASTA steps (not the last), end with verification commands for **that step only**.

## Spec variables

`SPEC`, `WEB_SPEC`, `MGMT_SPEC` support comma-separated values. Mobile flows use comma-separated `<area>` names after `--`.
