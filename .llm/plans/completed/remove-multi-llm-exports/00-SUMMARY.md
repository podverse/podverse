# Remove multi-LLM export system — summary

Created: 2026-05-23  
Scope: **Podverse** and **Metaboost** (Cursor-only going forward).

## Goal

Retire everything built to serve **more LLM IDEs than Cursor**: export scripts, GitHub Actions, `.llm/exports/` mirrors (`github-copilot`, `opencode`), vendor CLI, pre-commit guards, and non-Cursor onboarding docs.

Going forward, **`.cursor/skills/`**, **`.cursor/rules/`**, **`.cursorrules`**, and **`.cursorignore`** are the sole AI guidance source in each repo.

## Why now

The export pipeline duplicated Cursor guidance for Copilot/OpenCode consumers. The team standardizes on Cursor; maintaining mirrors, CI branches (`llm`, `llm-full`), and alignment prompts adds cost without benefit.

## Repos

| Repo | Plan set location |
| ---- | ----------------- |
| Podverse | `.llm/plans/active/remove-multi-llm-exports/` (this directory) |
| Metaboost | `metaboost/.llm/plans/active/remove-multi-llm-exports/` (mirrored plans 01–04 + 06) |

Execute Podverse plans 01–04 first, then Metaboost 01–04 (Podverse plan 05), then remote cleanup (plan 06, both repos).

## Plan files (Podverse)

| File | Focus |
| ---- | ----- |
| [01-remove-scripts-and-ci.md](./01-remove-scripts-and-ci.md) | Delete `scripts/llm/`, workflows, npm scripts, pre-commit guard, PR labeler `llm` label |
| [02-remove-exports-tree-and-gitignore.md](./02-remove-exports-tree-and-gitignore.md) | Delete `.llm/exports/`, clean `.gitignore` / `.cursorignore`, untrack cached paths |
| [03-rewrite-cursor-guidance.md](./03-rewrite-cursor-guidance.md) | Delete export skill/rule; simplify `llm-cursor-source`; update `AGENTS.md`, `.llm/LLM.md` |
| [04-revise-llm-docs.md](./04-revise-llm-docs.md) | Delete export docs; rewrite `DOCS-DEVELOPMENT-LLM.md`; fix inbound links |
| [05-metaboost-parity.md](./05-metaboost-parity.md) | Run Metaboost mirrored plans 01–04 |
| [06-remote-and-operator-cleanup.md](./06-remote-and-operator-cleanup.md) | Close `llm` / `llm-full` PRs and branches on GitHub (both repos) |

Execute via [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) and [COPY-PASTA.md](./COPY-PASTA.md).

## Keep (do not remove)

- `.cursor/**`, `.cursorrules`, `.cursorignore` — authoring source of truth
- `.llm/plans/`, `.llm/history/`, `.llm/context/` — Cursor-local workflow
- Podverse `complete-feature.yml` — history archival (not exports)
- `i18n-llm-translations` — locale translation tooling (unrelated)
- Completed plan archives under `.llm/plans/completed/` that mention exports (historical record)

## Decisions

- **Both repos** in scope; Metaboost mirrors Podverse today.
- **Remove** GitHub label auto-add `llm` from `pr-labeler.yml` (it signaled export consumers).
- **Rewrite** (not delete) `llm-cursor-source` rule/skill — still useful as Cursor-only policy.
- **Delete** `llm-exports-scripts` skill and `llm-exports-ci` rule entirely.
