# 04 — Verification and follow-ups

## Preconditions

Prompts `01`–`03` implemented as scoped by your branch.

## Checks

- **Lint:** `npm run lint` (repo root).
- **Build:** `npm run build:packages`; build `apps/web` and `apps/management-web` as needed.
- **Unit:** `npm run test` scoped to `packages/ui` / Modal test file if applicable.

## E2E (management-web UI changed)

Use **`make`** targets from Podverse repo root per [`.cursor/rules/e2e-run-with-make-only.mdc`](../../../../.cursor/rules/e2e-run-with-make-only.mdc). Prefer scoped specs, e.g.:

- `apps/management-web/e2e/storage-superuser-crud.spec.ts`
- `apps/management-web/e2e/feed-operations-flag-status.spec.ts`

Adjust selectors if tests assumed inline confirm markup.

Example (exact command in implementation response per project rules):

```bash
make e2e_test_management_web_report_spec SPEC=apps/management-web/e2e/storage-superuser-crud.spec.ts
```

(Add comma-separated `SPEC` list if multiple files need updating.)

## Follow-ups (optional)

- Focus trap / Escape / portal — not in scope unless product asks; current web `Modal` did not include them.

## Completion

Update `COPY-PASTA.md` in this directory, then move `.llm/plans/active/shared-modal-in-ui/` → `.llm/plans/completed/shared-modal-in-ui/` per [plan lifecycle](../../../../.cursor/rules/plan-lifecycle.mdc).
