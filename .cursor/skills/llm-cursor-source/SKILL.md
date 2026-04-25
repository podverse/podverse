---
name: llm-cursor-source
description: Repository source of truth for AI editor guidance is under .cursor, .cursorrules, and .cursorignore. Use when adding, editing, or deleting skills, rules, .cursorrules, or .cursorignore.
---

# LLM / Cursor source of truth

## What to commit

Only these paths define shared guidance for this repo:

- `.cursor/skills/**`
- `.cursor/rules/**`
- `.cursorrules` (repo root)
- `.cursorignore` (repo root) — path-level ignores for Cursor and some tooling

Do not commit ad-hoc skill/rule trees under `.github/`. **Machine export trees** under [`.llm/exports/`](../../../.llm/exports/) (per-target, allowlisted; see [EXPORT-TARGETS.md](../../../docs/development/llm/EXPORT-TARGETS.md)) are **not** a human or local-agent write target. **Rolling:** the **`llm-exports-sync`** action runs `llm:exports:sync` (incremental), updates branch **`llm`**, and its PR to **`develop`**. **On-demand full regen** (removes orphan files in exports): the **`llm-exports-full`** action runs `llm:exports:sync:full` and PR branch **`llm-full`**. You may run the same `npm` scripts locally to inspect. Generated content is **`.gitignore`d**; **`.llm/exports/`** is in **`.cursorignore`** for Cursor—do not commit or hand-edit generated `skills/`, `instructions/`, or `*-instructions.md` in feature PRs. See [`.llm/exports/README.md`](../../../.llm/exports/README.md) and the **`llm-exports-ci`** rule.

## Other LLM editors

Start from [`.llm/exports/`](../../../.llm/exports/) after pulling the latest **`develop`** (or checking the current **`llm -> develop`** automation PR) when your tool can use repo paths. If you still need a one-off pass, use:

- [docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md](../../../docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md)

Overview and policy:

- [docs/development/llm/README.md](../../../docs/development/llm/README.md)

## When .cursor changes

- Edit skills, rules, `.cursorrules`, and (when needed) `.cursorignore`, and commit them like any other source.
- **Do not** commit or push changes under the generated parts of **`.llm/exports`**. After your change lands on `develop` (or you run the **`llm-exports-sync`** `workflow_dispatch`), rolling automation updates branch `llm` and its PR to `develop`. Use **`llm-exports-full`** (or `llm:exports:sync:full` locally) when you need a full regen. Pull to refresh once the automation PR merges, or watch for PRs/issues labeled `llm`. Re-run the alignment prompt only if you use tooling that is not fully covered by the opt-in export targets.

## Skill file hygiene

- Skill frontmatter `name` should match the skill folder name.
- Keep exactly one blank line between closing frontmatter (`---`) and body content.

## Export / sync implementation

When you change the deterministic export (files under `scripts/llm/`), use the **llm-exports-scripts** skill. **Podverse and Metaboost** share the same pipeline shape; keep the mirrored `scripts/llm/**` files aligned when behavior should match.

Local vendor setup is opt-in via `npm run llm:vendors` (default active vendor: `cursor`).
