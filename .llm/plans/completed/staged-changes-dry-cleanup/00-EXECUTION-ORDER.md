# Execution order

Run the numbered prompts in order:

1. `01-delete-loading-overlay.md`
1. `02-delete-common-list-page-header.md`
1. `03-shared-error-boundary-shell.md`
1. `04-table-family-internal-dedupe.md`
1. `05-subscribed-list-header-hook.md`
1. `06-list-dropdown-config-factory.md`
1. `07-checkbox-and-alert-polish.md`
1. `08-i18n-and-delete-modal-cleanup.md`
1. `09-layout-naming-clarity.md`
1. `10-verification.md`

## Dependencies

- `01` and `02` are independent pure deletions — either order is fine.
- `03` depends on nothing in this set.
- `04` is internal to `packages/ui` table family; can run any time.
- `05` depends on `02` only if you want to keep the deletion sequence clean (the new hook
  imports `MainHeader` directly).
- `06` is independent of `05`; doing both before list-page edits is preferred.
- `07`, `08`, `09` are independent of each other.
- `10` runs last — full verification of the affected E2E surface.

## Recommended PR slicing

Group as 5 PRs:

1. `01` + `02` — pure deletions.
1. `03` — shared error boundary shell.
1. `04` — table family internals.
1. `05` + `06` — list page convergence (web only).
1. `07` + `08` + `09` — polish.

## Completion tracking

Use [COPY-PASTA.md](./COPY-PASTA.md). **This set is complete:** all prompts are checked and
the directory lives under **`.llm/plans/completed/staged-changes-dry-cleanup/`**. For new
plan sets, move **`active/` → `completed/`** when finished per
[`plan-completion`](../../../../.cursor/skills/plan-completion/SKILL.md).
