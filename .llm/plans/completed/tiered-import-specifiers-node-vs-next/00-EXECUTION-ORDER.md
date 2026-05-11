# Tiered import specifiers — execution order

Read `00-SUMMARY.md` first.

1. `01-tier-boundaries-and-scope.md` — confirm Tier A/B globs for Podverse.
2. `02-verification-spike.md` — optional reproduce Turbopack `.js`→`.tsx` behavior on current Next version.
3. `03-eslint-enforcement.md` — add `eslint-plugin-import-x` + Tier A/B overrides; run lint fix where safe.
4. `04-monorepo-sweep-matrix.md` — sweep workspaces; fix stragglers and edge cases.
5. `05-documentation-skills-rules.md` — land canonical doc, `.cursor` rule, skill, `AGENTS.md` pointers.
6. `06-future-convergence-todo.md` — keep as living checklist when upstream moves.

Use `COPY-PASTA.md` for checkbox prompts.

When all numbered items are done, move this directory from `.llm/plans/active/` to
`.llm/plans/completed/tiered-import-specifiers-node-vs-next/` per plan-completion workflow.
