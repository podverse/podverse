# COPY-PASTA — v4 migration resilience

## Phase 1 (01 and 02 at once; disjoint files except doc 05, which each edits in its own section)

- [x] **01 — Migration feed retry**
  **Cursor model:** Opus 5.5 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/v4-migration-resilience/01-migration-feed-retry.md
Follow .llm/plans/active/v4-migration-resilience/00-EXECUTION-ORDER.md rules. Put your release-notes entry in your final message.
```

- [x] **02 — The copy records what it could not finish**
  **Cursor model:** Opus 5.5 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/v4-migration-resilience/02-copy-records-unresolved.md
Follow .llm/plans/active/v4-migration-resilience/00-EXECUTION-ORDER.md rules. Put your release-notes entry in your final message.
```

## Phase 2

- [x] **03 — Legacy replay pass** (last prompt: append the phase 1 release entries, archive the set, give the cumulative verification)
  **Cursor model:** Opus 5.5 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/v4-migration-resilience/03-legacy-replay-pass.md
Follow .llm/plans/active/v4-migration-resilience/00-EXECUTION-ORDER.md rules.
```
