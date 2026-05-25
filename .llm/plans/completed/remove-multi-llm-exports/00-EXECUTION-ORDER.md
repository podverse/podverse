# Execution order — Remove multi-LLM exports

Run prompts from [COPY-PASTA.md](./COPY-PASTA.md).

## Phase 1 — Podverse pipeline removal

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 1.1 | [01-remove-scripts-and-ci.md](./01-remove-scripts-and-ci.md) | No `scripts/llm/`, no export workflows, no npm `llm:*` scripts |
| 1.2 | [02-remove-exports-tree-and-gitignore.md](./02-remove-exports-tree-and-gitignore.md) | No `.llm/exports/`; gitignore/cursorignore cleaned |

**Gate:** `rg 'export-from-cursor|llm-exports-sync' --glob '!**/.llm/plans/**'` returns no hits outside completed archives.

## Phase 2 — Podverse guidance and docs

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 2.1 | [03-rewrite-cursor-guidance.md](./03-rewrite-cursor-guidance.md) | Cursor-only rules/skills; `AGENTS.md` / `.llm/LLM.md` updated |
| 2.2 | [04-revise-llm-docs.md](./04-revise-llm-docs.md) | Export docs deleted; `DOCS-DEVELOPMENT-LLM.md` rewritten |

**Gate:** `./scripts/nix/with-env npm run lint` passes in Podverse.

## Phase 3 — Metaboost parity

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 3.1 | [05-metaboost-parity.md](./05-metaboost-parity.md) | Metaboost plans 01–04 executed |

**Gate:** Same grep + lint clean in Metaboost.

## Phase 4 — Remote cleanup (manual, after merge to develop)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 4.1 | [06-remote-and-operator-cleanup.md](./06-remote-and-operator-cleanup.md) | `llm` / `llm-full` branches and PRs closed on GitHub |

Phases 1–3 are code changes (one PR per repo or one combined PR per repo). Phase 4 runs after those merges land on `develop`.
