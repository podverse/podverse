# LLM and Cursor configuration

## Source of truth

Authoritative AI guidance for this repository lives only in:

- `.cursor/skills/**` — one `SKILL.md` per directory
- `.cursor/rules/**` — Cursor rules (`.mdc`)
- `.cursor/prompts/**` — reusable agent-facing prompt snippets
- `.cursor/hooks/**` and `.cursor/hooks.json` — optional Cursor project hooks (when used)
- `.cursorrules` — root-level rules
- `.cursorignore` — path-level ignores for Cursor

Cursor reads these paths directly after `git pull`. There is no separate generated mirror tree in the repo.

**`.llm/` is not abcmemory.** It is a planning workspace (plans, optional history, templates, context). **abcremember** writes to `.cursor/` by default, not `.llm/`, unless you explicitly say otherwise. See [.llm/LLM.md](../../.llm/LLM.md).

## What to commit

When you add or change skills, rules, prompts, hooks, or root Cursor config:

1. Edit files under `.cursor/`, `.cursorrules`, or `.cursorignore`.
2. Commit and push **only** those source paths in your PR.

Do not duplicate guidance under `.github/` or other ad-hoc trees. See the **llm-cursor-source** skill
(`.cursor/skills/llm-cursor-source/SKILL.md`) and rule (`.cursor/rules/llm-cursor-source.mdc`).

## Branch naming

Use an **`llm/<kebab-name>`** branch when the PR changes **only** LLM-related paths:

- **abcmemory:** `.cursor/**`, `.cursorrules`, `.cursorignore`
- **Contributor LLM docs:** `docs/development/llm/**`, relevant LLM sections of `AGENTS.md`
- **Planning workspace:** `.llm/**` (plans, templates, context, optional history)

Product or app changes belong on `feature/`, `fix/`, `chore/`, or other standard prefixes — not `llm/`.

Create a branch with `npm run start-feature` (choose **llm** in the type menu) or manually:

```bash
git checkout -b llm/your-description develop
```

Local pre-push hooks enforce allowed prefixes; see [BRANCH-PROTECTION.md](../../repo-management/BRANCH-PROTECTION.md).

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

## Related

- [AGENTS.md](../../../AGENTS.md) — AI development guide for the monorepo
- [.llm/LLM.md](../../.llm/LLM.md) — `.llm/` directory layout
- [LLM-HISTORY-WORKFLOW-ARCHIVE.md](LLM-HISTORY-WORKFLOW-ARCHIVE.md) — optional archived human workflow
