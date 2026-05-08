# Phase 05 — Cleanup and verification

## Goal

Remove dead code paths, run repo checks, add or update E2E coverage for touched flows,
update LLM history, and archive the plan set.

## Cleanup

- Confirm no remaining imports of deleted web NavBar modules or old `NavBar` slot props.
- Remove unused SCSS modules and exports.
- If `ManagementUserMenu` / `DashboardNavRight` were deleted, grep for stale imports.

## Tests

- **Unit**: `packages/ui` NavBar tests (phase 02) should still pass.
- **E2E** (per
  [.cursor/skills/feature-implementation-testing/SKILL.md](../../../../.cursor/skills/feature-implementation-testing/SKILL.md)):
  add or adjust Playwright specs for web navbar (account dropdown, search link visibility,
  mobile menu toggle if covered) and management-web dashboard header / user menu.

Use **make** targets from repo root per
[.cursor/rules/e2e-run-with-make-only.mdc](../../../../.cursor/rules/e2e-run-with-make-only.mdc).

Suggested scoped commands (adjust spec paths to match added tests):

```bash
make e2e_test_web_report_spec SPEC=e2e/<web-navbar-related>.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/<mgmt-navbar-related>.spec.ts
```

## LLM history

Update
`.llm/history/active/navbar-shared-ui/navbar-shared-ui-part-01.md` with the final session:
verbatim prompts, decisions, files touched.

## Plan completion

When verified:

1. Mark all items in
   [.llm/plans/active/navbar-shared-ui/COPY-PASTA.md](./COPY-PASTA.md).
2. Move numbered phase files and `00-SUMMARY.md` to
   `.llm/plans/completed/navbar-shared-ui/`.
3. Move `COPY-PASTA.md` and `00-EXECUTION-ORDER.md` last, per
   [plan-completion](../../../../.cursor/skills/plan-completion/SKILL.md).

## Commands (full sanity)

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
```
