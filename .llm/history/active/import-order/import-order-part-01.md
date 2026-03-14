# Feature: import-order (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `import-order-part-02.md`.

## Metadata

- Started: 2026-03-13
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/96
- Branch: chore/import-order
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Standardize import order across the monorepo via ESLint so the documented convention (Node built-ins → external → workspace → relative → styles last) is enforced and fixable with `npm run lint:fix`.

## Sessions

### Session 1 - 2026-03-13

#### Prompt (Developer)

Standardize Import Order via ESLint — Implement the plan as specified. Do NOT edit the plan file itself. Mark todos in progress and complete all.

#### Key Decisions

- Used `eslint-plugin-simple-import-sort` (Option B) for simplicity and reliable autofix.
- Groups: node builtins, external (excluding `@podverse/`), `@podverse/*`, relative, then styles (`^.+\\.(css|scss|sass)$`).
- Disabled `simple-import-sort/imports` for `apps/management-web/src/app/layout.tsx` (root styles must be first).
- Updated skills/rules to reference ESLint enforcement and `npm run lint:fix`.

#### Files Changed

- package.json (added eslint-plugin-simple-import-sort)
- eslint.config.mjs (plugin, rule, layout override)
- .llm/context/conventions.md, AGENTS.md (enforcement note)
- .cursor/skills/styles-import-last/SKILL.md, .cursor/skills/global/SKILL.md
- .cursor/rules/type-imports-separate-line.mdc
- Many source files (one-time lint:fix)

---

## Related Resources

- [Link to PR]
- [Link to related issues]
