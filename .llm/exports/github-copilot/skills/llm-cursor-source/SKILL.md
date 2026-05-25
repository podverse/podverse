---
name: llm-cursor-source
description: Repository source of truth for AI editor guidance is under .cursor, .cursorrules, and .cursorignore. Use when adding, editing, or deleting skills, rules, .cursorrules, or .cursorignore.
---


# LLM / Cursor source of truth

## What to commit

Only these paths define shared guidance for this repo:

- `.llm/exports/github-copilot/skills/**`
- `.llm/exports/github-copilot/instructions/**`
- `.cursorrules` (repo root)
- `.cursorignore` (repo root) — path-level ignores for Cursor and some tooling

Do not commit ad-hoc skill/rule trees under `.github/`. **Machine export trees** under [`.llm/exports/`](../../../.llm/exports/) (per-target, allowlisted; see [EXPORT-TARGETS.md](../../../docs/development/llm/EXPORT-TARGETS.md)) are **not** a default write target for humans or for agents: **llm-exports-sync** and **llm-exports-full-sync** in GitHub Actions are the **canonical** producers; they open/update PRs on branches **`llm`** and **`llm-full`**. `npm run llm:exports:sync` is **gated** outside CI (`LLM_EXPORT_ALLOW_LOCAL=1` is required to write locally, for [scripts/llm/](../../../scripts/llm/) work only). Generated content is **`.gitignore`d**; **`.llm/exports/`** is in **`.cursorignore`** for Cursor. Do not commit or hand-edit generated `skills/`, `instructions/`, or `*-instructions.md` in feature PRs. See [`.llm/exports/LLM-EXPORTS.md`](../../../.llm/exports/LLM-EXPORTS.md) and the **`llm-exports-ci`** rule.

## Other LLM editors

Start from [`.llm/exports/`](../../../.llm/exports/) after pulling the latest **develop** (or checking the current **`llm` → `develop`** automation PR) when your tool can use repo paths. If you still need a one-off pass, use:

- [docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md](../../../docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md)

Overview and policy:

- [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](../../../docs/development/llm/DOCS-DEVELOPMENT-LLM.md)

## When .cursor changes

- Edit skills, rules, `.cursorrules`, and (when needed) `.cursorignore`, and commit them like any other source.
- **Do not** run a local LLM export sync to “refresh” exports, and do not commit or push changes under the generated parts of **`.llm/exports`**. After your work lands on **develop**, automation updates branch **`llm`** and its PR. Pull **develop** once that PR is merged, or follow the open **`llm` → `develop`** PR. Re-run the alignment prompt only if you use tooling that is not fully covered by the opt-in export targets.

## Skill file hygiene

- Skill frontmatter `name` should match the skill folder name.
- Keep exactly one blank line between closing frontmatter (`---`) and body content.

## Export / sync implementation

When you change the deterministic export (files under `scripts/llm/`), use the **llm-exports-scripts** skill. **Podverse and Metaboost** share the same pipeline shape; keep the mirrored `scripts/llm/**` files aligned when behavior should match.

Local vendor setup is opt-in via `npm run llm:vendors` (default active vendor: `cursor`).
