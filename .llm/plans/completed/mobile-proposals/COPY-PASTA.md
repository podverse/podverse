# COPY-PASTA — mobile proposals

Execute prompts in order. Mark `[x]` when complete. Move completed numbered files to
`.llm/plans/completed/mobile-proposals/` when the full set is done.

## CRITICAL: Execution rules

- **Phases are sequential:** Phase 1 → wait → Phase 2 step 1 → wait → Phase 2 parallel group → wait
  → Phase 2 step 3.
- **Do not** run Phase 2 while Phase 1 is in progress.
- **Parallel group (05, 06, 07):** start only after 04 is complete; wait for all three before 08.

---

## Phase 1 — Track A (sequential)

### Prompt 1

```
Read and execute .llm/plans/active/mobile-proposals/01-monorepo-current-state.md

Generate the proposal doc at docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-CURRENT-STATE.md.
Explore the repo; cite real paths. Include mermaid if helpful. Docs only — no code changes.
```

- [x] **Prompt 1** complete

### Prompt 2

```
Read and execute .llm/plans/active/mobile-proposals/02-monorepo-target-structure.md

Generate docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md.
Build on 01 output. Docs only — no code changes.
```

- [x] **Prompt 2** complete

### Prompt 3

```
Read and execute .llm/plans/active/mobile-proposals/03-llm-cursor-setup.md

Generate docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md.
Docs only — no code changes.
```

- [x] **Prompt 3** complete

---

## Phase 2 — Track B

### Prompt 4 (run first; blocking)

```
Read and execute .llm/plans/active/mobile-proposals/04-process-overview-architecture.md

Generate docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md.
Heavily code-grounded; include screen map and architecture mermaid. Docs only.
```

- [x] **Prompt 4** complete

### Prompts 5–7 (parallel — 3 agents after Prompt 4)

**Agent 5A:**

```
Read and execute .llm/plans/active/mobile-proposals/05-process-shared-vs-divergent.md

Generate docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md.
Docs only — no code changes.
```

**Agent 5B:**

```
Read and execute .llm/plans/active/mobile-proposals/06-process-playback-queue-parity.md

Generate docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md.
Docs only — no code changes.
```

**Agent 5C:**

```
Read and execute .llm/plans/active/mobile-proposals/07-process-mobile-only-features.md

Generate docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md.
Docs only — no code changes.
```

- [x] **Prompt 5A** complete
- [x] **Prompt 5B** complete
- [x] **Prompt 5C** complete

### Prompt 8 (last — after 5A–5C)

```
Read and execute .llm/plans/active/mobile-proposals/08-process-roadmap-milestones.md

Generate docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-ROADMAP.md.
Read Track B docs 04–07 if present. Docs only — no code changes.
```

- [x] **Prompt 8** complete

---

## Operator verification (after all prompts)

```bash
ls docs/proposals/mobile/monorepo-llm-setup/
ls docs/proposals/mobile/app-development-process/
```
