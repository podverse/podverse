# Mobile proposals — overview

Created: 2026-06-24

This plan set orchestrates **documentation-only** work: generating detailed, code-grounded proposal
docs for Podverse mobile. It does **not** implement `apps/mobile` or change production code.

## Goal

Produce two proposal tracks under `docs/proposals/mobile/`:

| Track | Output directory | Purpose |
| ----- | ---------------- | ------- |
| **A — Monorepo + LLM setup** | `docs/proposals/mobile/monorepo-llm-setup/` | Assess current repo readiness; target structure for RN + Cursor |
| **B — App development process** | `docs/proposals/mobile/app-development-process/` | High-level build process; web parity; mobile-only features; roadmap |

These **complement** (do not replace) the decision docs already at
[docs/proposals/mobile/initial-decisions/](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE.md)
(RN, monorepo, CarPlay/Android Auto, versioning, LLM context).

## How to run

1. Read [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) for phase sequencing.
2. Open [COPY-PASTA.md](COPY-PASTA.md).
3. Paste each prompt into a Cursor agent **in order**; wait for each phase to finish before the next.
4. After all prompts complete, move this directory to `.llm/plans/completed/mobile-proposals/` per
   plan lifecycle (operator).

## Output map

| Plan file | Generated doc |
| --------- | ------------- |
| [01-monorepo-current-state.md](01-monorepo-current-state.md) | `monorepo-llm-setup/DOCS-MOBILE-MONOREPO-CURRENT-STATE.md` |
| [02-monorepo-target-structure.md](02-monorepo-target-structure.md) | `monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md` |
| [03-llm-cursor-setup.md](03-llm-cursor-setup.md) | `monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md` |
| [04-process-overview-architecture.md](04-process-overview-architecture.md) | `app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md` |
| [05-process-shared-vs-divergent.md](05-process-shared-vs-divergent.md) | `app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md` |
| [06-process-playback-queue-parity.md](06-process-playback-queue-parity.md) | `app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md` |
| [07-process-mobile-only-features.md](07-process-mobile-only-features.md) | `app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md` |
| [08-process-roadmap-milestones.md](08-process-roadmap-milestones.md) | `app-development-process/DOCS-MOBILE-PROCESS-ROADMAP.md` |

## Conventions for every generated doc

- **Code-grounded:** Explore the repo; cite real paths, route names, hooks, `req*` wrappers.
- **Assume decisions made:** React Native (Expo prebuild), monorepo `apps/mobile`, thin native car
  layer — do not relitigate (link to initial-decisions instead).
- **Markdown:** ≤100 col, aligned tables, blank lines around lists/headings/code blocks.
- **Links:** Cross-tree use repo-root `/` paths; same-subtree use relative paths.
- **Diagrams:** Include mermaid where they aid comprehension (no colors; valid node IDs).
- **No README.md** in subdirs; use descriptive `DOCS-*.md` names per documentation-conventions.

## Key repo anchors (starting points for exploration)

- Packages: `packages/helpers`, `packages/helpers-requests`, `packages/http-request-core`
- Web playback: `apps/web/src/lib/playback/`, `.cursor/skills/media-player-architecture/SKILL.md`
- Web queue/auto-queue: `apps/web/src/contexts/Queue.tsx`, `AutoQueue.tsx`
- API routes: `apps/api/src/routes/{auth,queue,playlist,item,channel,account}.ts`
- API client boundary: [docs/development/API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)
- Import tiers: [docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md)
- Cursor: `.cursor/rules/`, `.cursor/skills/`, `.cursorignore`, `AGENTS.md`, `apps/web/AGENTS.md`

## Verification (operator, after all prompts)

Docs-only — no tests. Confirm all eight output files exist and cross-link correctly:

```bash
ls docs/proposals/mobile/monorepo-llm-setup/
ls docs/proposals/mobile/app-development-process/
```
