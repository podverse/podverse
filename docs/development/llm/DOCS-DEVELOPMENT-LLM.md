# LLM and Cursor configuration

## Source of truth

Authoritative AI guidance for this repository lives only in:

- `.cursor/skills/**` — one `SKILL.md` per directory
- `.cursor/rules/**` — Cursor rules (`.mdc`)
- `.cursorrules` — root-level rules
- `.cursorignore` — path-level ignores for Cursor

Cursor reads these paths directly after `git pull`. There is no separate generated mirror tree in the repo.

## What to commit

When you add or change skills, rules, or root Cursor config:

1. Edit files under `.cursor/`, `.cursorrules`, or `.cursorignore`.
2. Commit and push **only** those source paths in your PR.

Do not duplicate guidance under `.github/` or other ad-hoc trees. See the **llm-cursor-source** skill
(`.cursor/skills/llm-cursor-source/SKILL.md`) and rule (`.cursor/rules/llm-cursor-source.mdc`).

## Plans and optional history

- **Plans:** active work under `.llm/plans/active/`; completed sets under `.llm/plans/completed/`.
  Keep individual plan files under 300 lines. When you finish a plan, move it per
  `.cursor/skills/plan-completion/SKILL.md`.
- **History (optional):** some teams keep notes under `.llm/history/active/<feature>/`. That is not
  required for contributing. A retired human-only workflow description is in
  [LLM-HISTORY-WORKFLOW-ARCHIVE.md](LLM-HISTORY-WORKFLOW-ARCHIVE.md) (listed in `.cursorignore` so
  Cursor does not treat it as agent instructions).
- **Layout overview:** [.llm/LLM.md](../../.llm/LLM.md).

When a PR merges to `develop`, `.github/workflows/complete-feature.yml` may archive a matching
`.llm/history/active/<feature-name>/` folder if one exists.

## What we removed

This repo no longer maintains machine-generated multi-editor export mirrors under `.llm/exports/` or
CI that published them. Cursor-only source under `.cursor/` is the policy going forward.

## Related

- [AGENTS.md](../../../AGENTS.md) — AI development guide for the monorepo
- [.llm/LLM.md](../../.llm/LLM.md) — `.llm/` directory layout
- [LLM-HISTORY-WORKFLOW-ARCHIVE.md](LLM-HISTORY-WORKFLOW-ARCHIVE.md) — optional archived human workflow
