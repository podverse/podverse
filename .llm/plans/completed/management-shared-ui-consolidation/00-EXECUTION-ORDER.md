# Execution Order

Execute the numbered prompts in this order:

1. `01-settings-selector-and-form-dropdown-convergence.md`
2. `02-account-menu-convergence.md`
3. `03-form-stack-and-login-form-cleanup.md`
4. `04-navbar-brand-convergence-spike.md`
5. `06-destructive-actions-confirmpanel-standardization.md`
6. `07-shared-client-session-guard-hook.md`
7. `05-verification-and-followups.md` (final sweep after implementation batches)

## Dependencies

- `01` should run before broad selector migrations; it introduces the shared selector/dropdown primitive.
- `02` can run after the existing shared dropdown keyboard/menu work is stable.
- `03` can run independently, but may reuse the shared selector from `01`.
- `04` is a spike; implement only the narrow brand/shell piece if the audit confirms low risk.
- `06` and `07` are management-web-only refactors; they can run in parallel with `01`–`04` if staffed, but keep `05` last for a full-set verification pass.
- `05` runs after the implementation prompts that apply to your branch (including `06` and `07` when those are in scope).

## Completion Tracking

Mark each completed item in `COPY-PASTA.md`. When the whole set is complete, move this directory from `.llm/plans/active/management-shared-ui-consolidation/` to `.llm/plans/completed/management-shared-ui-consolidation/`.

**Status:** Set completed; plan assets live under `.llm/plans/completed/management-shared-ui-consolidation/`.
