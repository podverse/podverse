# LLM and AI editor configuration

## Source of truth (what we commit)

This repository’s **authoritative** AI guidance is:

- `.cursor/skills/**` — one `SKILL.md` per directory
- `.cursor/rules/**` — Cursor rules (`.mdc`)
- `.cursorrules` — root-level rules

[`.llm/exports/`](../../.llm/exports/) holds **machine-generated** per-target trees (`github-copilot`, `opencode`, etc.). The **`llm-exports-sync`** GitHub Action (**LLM exports sync**) is the **only normal producer**: it runs on pushes to **develop** (or manual dispatch) and updates branch **`llm`** and its PR into **`develop`**. Pull requests that change `.cursor` or export scripts are **not** required to pre-commit a matching export tree; merge to **develop** triggers the sync, then review/merge the rolling **`llm`** → **`develop`** PR when you want the mirrors updated. The separate **`llm-exports-full-sync`** Action (**LLM exports full**) is **on-demand** only: full regen (removes orphans under each target’s generated subtrees) and a PR on **`llm-full`**. For catch-up after large renames, run **LLM exports full** from the Actions tab.

**Local runs:** the export script **does not write** to `.llm/exports` outside GitHub Actions unless you set `LLM_EXPORT_ALLOW_LOCAL=1` (intended for **editing and testing** [scripts/llm/](../../../scripts/llm/) only). The npm scripts are `llm:exports:sync` (incremental) and `llm:exports:sync:full` (full). Example: `LLM_EXPORT_ALLOW_LOCAL=1 npm run llm:exports:sync`. For normal work on skills and rules, **do not** set this; commit `.cursor` changes and let the **`llm`** automation PR update exports.

**Spurious `git` changes under `.llm/exports`:** if tracked export files show as modified (for example after an old local sync or tooling), run `npm run llm:exports:restore` to match the last commit, or `git restore .llm/exports` yourself.

The generated files remain **`.gitignore`d**; **`.llm/exports/`** is in **`.cursorignore`**. The workflow stages them with `git add -A -f` on the runner. The pre-commit hook can prompt if you try to add ignored export paths. See [`.llm/exports/LLM-EXPORTS.md`](../../.llm/exports/LLM-EXPORTS.md) and [EXPORT-TARGETS.md](EXPORT-TARGETS.md).

## Who should read this

- **Cursor users:** The paths above are what you get from `git pull`; no extra step.
- **Other LLM tools or IDEs** that expect their own project-level instructions: use the alignment prompt on first clone and after `.cursor` changes (see below).

## Exports + GitHub (operators)

- [GH-EXPORTS-SETUP.md](GH-EXPORTS-SETUP.md) — `gh` commands and notes for **Podverse and Metaboost** (labels, optional secrets, running workflows).

## Non-Cursor editors: alignment prompt

Use the checked-in **`.llm/exports/...`** trees when your editor can read from a repo path. If you still need a one-off local conversion, run this **first** when setting up, and **again** after you pull work that changes `.cursor` or `.cursorrules` (or when you see PRs and issues labeled **`llm`**):

- [LLM-EDITOR-ALIGNMENT-PROMPT.md](LLM-EDITOR-ALIGNMENT-PROMPT.md)

That prompt asks your tool to create or refresh local config from the repo’s `.cursor` content, add ignore rules for any generated paths, and stay aligned over time.

## GitHub: `llm` label

Pull requests that touch `.cursor/**` or `.cursorrules` are labeled **`llm`** so it is easy to see when shared AI guidance changed. For **issues** about the same, add the `llm` label when you file or triage the ticket (the PR labeler only runs on pull requests).

## History

- The old “Cursor to Copilot sync” flow is retired. See [CURSOR-COPILOT-SYNC.md](CURSOR-COPILOT-SYNC.md) for a one-line pointer.

Local vendor setup is opt-in via `npm run llm:vendors` (default active vendor: `cursor`).
