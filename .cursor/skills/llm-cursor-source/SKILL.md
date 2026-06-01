---
name: llm-cursor-source
description: Repository source of truth for AI editor guidance is under .cursor, .cursorrules, and .cursorignore. Use when adding, editing, or deleting skills, rules, .cursorrules, or .cursorignore.
---

# LLM / Cursor source of truth

## What to commit

Only these paths define shared guidance for this repo:

- `.cursor/skills/**`
- `.cursor/rules/**`
- `.cursor/prompts/**`
- `.cursor/hooks/**` and `.cursor/hooks.json` (when present)
- `.cursorrules` (repo root)
- `.cursorignore` (repo root) — path-level ignores for Cursor

Do not commit ad-hoc skill or rule trees under `.github/` or other paths outside `.cursor/`.

Operator directory docs (`CURSOR-*.md`, `LLM-*.md`) describe folders for humans; they are not a second source of agent rules.

## When `.cursor` changes

- Edit skills, rules, prompts, hooks, `.cursorrules`, and (when needed) `.cursorignore`, then commit them like any other source.
- Do not add duplicate guidance elsewhere; keep one source of truth under `.cursor/`.
- Use an **`llm/<kebab-name>`** branch when the PR changes only LLM-related paths (`.cursor/**`, `.cursorrules`, `.cursorignore`, `docs/development/llm/**`, `.llm/**`, relevant `AGENTS.md` sections). See [DOCS-DEVELOPMENT-LLM.md](../../../docs/development/llm/DOCS-DEVELOPMENT-LLM.md) § Branch naming.

## Skill file hygiene

- Skill frontmatter `name` should match the skill folder name.
- Keep exactly one blank line between closing frontmatter (`---`) and body content.

## Contributor policy

Overview, plans, and optional history notes:

- [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](../../../docs/development/llm/DOCS-DEVELOPMENT-LLM.md)
