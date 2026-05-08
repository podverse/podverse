# Execution Order

Execute the numbered prompts in this order:

1. `01-shared-ui-loading-spinner.md`
2. `02-web-migration.md`
3. `03-management-web-and-inline-spinner-removal.md`
4. `04-verification-and-followups.md` (final sweep after implementation batches)

## Dependencies

- `01` introduces the shared component(s); `02` and `03` depend on it.
- `02` (web migration) and `03` (management-web migration + removal) can run in parallel
  if staffed, but `03` is the one that actually deletes `LoadingText` and `InlineSpinner`
  from `@podverse/ui` — it must finish after `01` so the new `LoadingSpinner` exists, and
  it should not delete the legacy components until **all** importers across both apps are
  switched (so `02` should typically land first).
- `04` runs last to lint, type-check, run `@podverse/ui` tests, and run scoped E2E.

## Completion Tracking

Mark each completed item in `COPY-PASTA.md`. When the whole set is complete, move this
directory from `.llm/plans/active/shared-loading-spinner-consolidation/` to
`.llm/plans/completed/shared-loading-spinner-consolidation/` per
[plan-completion](../../../../.cursor/skills/plan-completion/SKILL.md).
