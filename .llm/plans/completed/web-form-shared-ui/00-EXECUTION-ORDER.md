# Web Form → shared UI — execution order

Run the numbered prompts in [`COPY-PASTA.md`](COPY-PASTA.md) in order:

1. [`01-inventory-naming-and-collisions.md`](./01-inventory-naming-and-collisions.md) — Full import
   graph, export naming (`TextArea` vs composite), merge strategy for checkbox variants.
2. [`02-promote-simple-form-controls.md`](./02-promote-simple-form-controls.md) — Checkbox (labeled),
   RadioButton, SwitchButton, InlineForm → `packages/ui`; wire web SCSS (web baseline).
3. [`03-promote-text-input-family.md`](./03-promote-text-input-family.md) — TextInput, TextInputNumber,
   increments, HHMMSS; depends on `Button` / tokens already in ui.
4. [`04-promote-textarea-search-and-checkbox-groups.md`](./04-promote-textarea-search-and-checkbox-groups.md)
   — Composite textarea export name, SearchInput, TextCheckboxes.
5. [`05-apps-web-migration-and-cleanup.md`](./05-apps-web-migration-and-cleanup.md) — Replace all web
   imports; delete `apps/web/src/components/Form/` and orphaned Form SCSS shims.
6. [`06-management-web-convergence.md`](./06-management-web-convergence.md) — Align CRUD/settings
   patterns that use `Input`+`Label` with shared rich fields where equivalent.
7. [`07-verification-and-rollout.md`](./07-verification-and-rollout.md) — Unit tests in `packages/ui`,
   targeted E2E (`make`), history and plan lifecycle.

**Archive:** When all phases complete, move this directory to
`.llm/plans/completed/web-form-shared-ui/` per plan lifecycle.
