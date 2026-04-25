---
name: llm-cursor-source
description: Repository source of truth for AI editor guidance is under .cursor and .cursorrules only. Use when adding, editing, or deleting skills, rules, or .cursorrules.
---


# LLM / Cursor source of truth

## What to commit

Only these paths define shared guidance for this repo:

- `.llm/exports/github-copilot/skills/**`
- `.llm/exports/github-copilot/instructions/**`
- `.cursorrules` (repo root)

Do not commit ad-hoc skill/rule trees under `.github/`. **Machine export trees** (for example `.llm/exports/github-copilot/`) are **not** a human or local-agent write target: the **`llm-exports-sync`** GitHub Action runs `npm run llm:exports:sync`, updates branch **`llm`**, and creates or updates a PR from **`llm`** into **`develop`**. You may run `llm:exports:sync` locally to inspect; generated paths are **`.gitignore`d** and listed in **`.cursorignore`**, so do **not** commit or hand-edit them. PRs that add or modify those files are blocked in CI (see [`.llm/exports/README.md`](../../../.llm/exports/README.md)).

## Other LLM editors

Start from [`.llm/exports/`](../../../.llm/exports/) after pulling the latest **`develop`** (or checking the current **`llm -> develop`** automation PR) when your tool can use repo paths. If you still need a one-off pass, use:

- [docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md](../../../docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md)

Overview and policy:

- [docs/development/llm/README.md](../../../docs/development/llm/README.md)

## When .cursor changes

- Edit skills and rules in `.cursor` (and `.cursorrules` if needed) and commit them like any other source.
- **Do not** commit or push changes under the generated parts of **`.llm/exports`**. After your change lands on `develop` (or you run `workflow_dispatch`), automation refreshes branch `llm` and its rolling PR to `develop`; pull to refresh once that PR merges. Re-run the alignment prompt only if you use tooling that is not covered by the exports tree, or watch for PRs/issues labeled `llm`.

## Skill file hygiene

- Skill frontmatter `name` should match the skill folder name.
- Keep exactly one blank line between closing frontmatter (`---`) and body content.
