# Documentation, skills, rules (Podverse)

## Canonical doc

Create (or complete):

[`docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md`](../../../../docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md)

Contents:

- Tier A vs Tier B vs Tier C (`packages/ui`) table (same as plan).
- Why Next differs (Turbopack vs `tsc` / Node).
- Link [vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945).
- Pointer to **`.llm/plans/active/tiered-import-specifiers-node-vs-next/06-future-convergence-todo.md`** for follow-up.

## AGENTS.md

Add a short bullet under **Coding Patterns** or **Critical Rules** linking the doc above.

## `.llm/LLM.md` (optional)

One-line pointer to the tooling doc for LLM workflows.

## Cursor rule

Add [`.cursor/rules/import-specifiers-tiered.mdc`](../../../../.cursor/rules/import-specifiers-tiered.mdc):

- Prefer **`globs`** for `apps/web/src/**`, `apps/management-web/src/**` (and e2e if desired).
- **`alwaysApply: false`** unless you want global reminder.
- Content: do not bulk-rewrite Tier B relatives to `.js` without green `next build`; cite doc.

## Skill

Add [`.cursor/skills/import-specifiers-tiered/SKILL.md`](../../../../.cursor/skills/import-specifiers-tiered/SKILL.md):

- When to use: editing imports across packages vs Next apps.
- Link doc + root `eslint.config.mjs`.

If the repo maintains a skills index file under `.cursor/skills/`, add a row (Podverse may use exports-only; add skill directory regardless).

## Exports

Do **not** hand-edit [`.llm/exports/`](../../../../.llm/exports/) — automation only ([llm-cursor-source](../../../../.cursor/rules/llm-cursor-source.mdc)).
