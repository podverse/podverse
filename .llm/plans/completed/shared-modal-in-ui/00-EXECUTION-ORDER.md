# Execution Order

Execute the numbered prompts in this order:

1. `01-modal-in-packages-ui.md`
2. `02-web-migrate-modal-imports.md`
3. `03-management-web-modal-convergence.md`
4. `04-verification-and-followups.md`

## Dependencies

- `01` must complete before `02` and `03` (consumers need the export).
- `02` and `03` can run in parallel after `01` if staffed separately.
- `04` runs last.

## Completion Tracking

Mark each completed item in `COPY-PASTA.md`. When the whole set is complete, move this directory from `.llm/plans/active/shared-modal-in-ui/` to `.llm/plans/completed/shared-modal-in-ui/`.
