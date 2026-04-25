# LLM and AI editor configuration

## Source of truth (what we commit)

This repository’s **authoritative** AI guidance is:

- `.cursor/skills/**` — one `SKILL.md` per directory
- `.cursor/rules/**` — Cursor rules (`.mdc`)
- `.cursorrules` — root-level rules

**Optional machine-generated** copies for other tools live under [`.llm/exports/`](../../.llm/exports/) (for example the `github-copilot` tree). The **`llm-exports-sync`** GitHub Action (**LLM exports sync**) is the **canonical day-to-day updater**; it updates branch **`llm`** and opens/updates one PR into **`develop`**. The separate **`llm-exports-full-sync`** Action (**LLM exports full**) is **on-demand** only: it fully regenerates each opt-in export target (wiping that target’s generated content first so renames and deletes in `.cursor` do not leave stale files), and opens/updates a PR on branch **`llm-full`**. For normal PRs, use the rolling sync. Run **LLM exports full** when you need a catch-up after big refactors, or if mirrors look out of date.

Local equivalents: `npm run llm:exports:sync` (incremental) and `npm run llm:exports:sync:full` (full regen).

Generated paths are **`.gitignore`d** and **`.llm/exports/`** is in **`.cursorignore`** so Cursor and local agents are not nudged to hand-edit the mirror. **Do not** commit or push hand edits to the generated `skills/`, `instructions/`, or tool-specific instruction files in feature PRs. See [`.llm/exports/README.md`](../../.llm/exports/README.md) for **naming**, the **`.github/` exception for `github-copilot`**, and merge steps for local Copilot use. Per-target output contracts: [EXPORT-TARGETS.md](EXPORT-TARGETS.md).

We do **not** commit a duplicate Copilot mirror as ad-hoc tracked files under `.github/`; that directory stays for CI, workflows, and other repo config. For Copilot project instructions, **map** the `github-copilot` export from `.llm/exports/` into `.github/` on your side when you need that layout, per the exports README.

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
