# Shared UI Convergence — execution order

Run the numbered prompts in `COPY-PASTA.md` in order:

1. `01-policy-rules-and-skills.md` — Cursor rules, skill, `.cursorrules`, `AGENTS.md`
2. `02-icon-button-web-first-convergence.md` — `@podverse/ui` IconButton + web header wrapper
3. `03-dropdown-primitives-web-first-convergence.md` — `useDropdownKeyboardNavigation` in `packages/ui`
4. `04-callsite-migration-and-cleanup.md` — Imports, remove duplicate hook, optional SCSS cleanup
5. `05-verification-and-followups.md` — Lint, type-check, tests, E2E, history/docs

When a phase is done, mark it in `COPY-PASTA.md` and move completed numbered files to `.llm/plans/completed/shared-ui-convergence/` per plan lifecycle rules.
