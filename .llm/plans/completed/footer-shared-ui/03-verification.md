# 03 — Verification

## Goal

Confirm lint, type-check, and optional scoped E2E after the footer extraction.

## Commands (repo root)

Use [`nix-terminal-wrapper`](../../../../.cursor/rules/nix-terminal-wrapper.mdc) if your shell has no
global Node:

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
```

Optional: `npm run test -w @podverse/ui` if you added unit tests in step 01.

## E2E

UI changed under `apps/web`. Use **make** targets only ([`e2e-run-with-make-only`](../../../../.cursor/rules/e2e-run-with-make-only.mdc)).
Suggested scoped smoke:

```bash
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts
```

Use another spec only if `smoke.spec.ts` does not cover the main layout/footer route you care about.

## History

- Append a session to the appropriate
  [`.llm/history/active/`](../../../../.llm/history/active/) file per
  [llm-history-tracking](../../../../.cursor/rules/llm-history-tracking.mdc).

## Plan set completion

- Update [COPY-PASTA.md](./COPY-PASTA.md) checkboxes.
- Move `.llm/plans/active/footer-shared-ui/` to `.llm/plans/completed/footer-shared-ui/` when all
  steps are done.
