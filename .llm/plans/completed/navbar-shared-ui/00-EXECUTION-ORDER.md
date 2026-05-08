# Execution Order

Execute the numbered prompts in this order:

1. `01-design-and-types.md`
2. `02-composite-and-tests.md`
3. `03-apps-web-migration.md`
4. `04-apps-management-web-migration.md`
5. `05-cleanup-and-verification.md`

## Dependencies

- `01` locks props and export shape; no runtime behavior change.
- `02` depends on `01` — implements the composite in `@podverse/ui`.
- `03` and `04` depend on `02` — migrate consumers to the new API.
- `03` (web) and `04` (management-web) may proceed in parallel after `02` if staffed,
  but coordinate if either touches shared exports or types.
- `05` runs last: lint, build, scoped E2E, history, archive plan set.

## Completion Tracking

Mark each completed item in `COPY-PASTA.md`. When the whole set is complete, move this
directory from `.llm/plans/active/navbar-shared-ui/` to
`.llm/plans/completed/navbar-shared-ui/` per
[plan-completion](../../../../.cursor/skills/plan-completion/SKILL.md).
