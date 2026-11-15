# COPY-PASTA — v4 signed-out carryover

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Phase order and
the cumulative verification: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

Start only after `add-by-rss-directory-match` is complete. Prompts 01–05 are done and archived
under `.llm/plans/completed/v4-signed-out-carryover/`. Prompt 06 stays blocked: the feed-list
field spike in doc 08 § Open questions still says "Not run", so the Continue Migration screen
stays blocked.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run v4-signed-out-carryover`.
One prompt per phase. Prompt 06 stops with `RUNNER-STATUS: BLOCKED` until the feed-list field
spike is written into doc 08 § Open questions; that is expected. After writing
it, resume with
`./scripts/abcplan/run.sh run v4-signed-out-carryover --resume 'Spike results are in doc 08.'`
(`/abcresume` gives the ready-made commands).

By hand: one Cursor window, **Cursor Grok 4.7**, Fast off, the reasoning on each prompt.

Prompts do not run tests. The operator runs the cumulative verification after prompt 07.

## Phase 1

- [x] **01 — Legacy podcast map rows with the v4 feed URL**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/completed/v4-signed-out-carryover/01-legacy-podcast-map.md

Follow .llm/plans/active/v4-signed-out-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Run make db_regen_linear_baseline after the SQL. Do not run the worker command. Do not run tests.
```

## Phase 2

- [x] **02 — Public legacy podcast lookup route**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/completed/v4-signed-out-carryover/02-legacy-podcast-lookup-route.md

Follow .llm/plans/active/v4-signed-out-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Batch every lookup; never one query per id. Do not run tests. Do not commit.
```

## Phase 3

- [x] **03 — Library copy: matching Add by RSS URLs become directory follows**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/completed/v4-signed-out-carryover/03-library-copy-directory-match.md

Follow .llm/plans/active/v4-signed-out-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Copy, dry run, and verify must use the same split. Do not run tests. Do not commit.
```

## Phase 4

- [x] **04 — Phone reads v4 signed-out state once (gated)**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/completed/v4-signed-out-carryover/04-mobile-carryover-read.md

Follow .llm/plans/active/v4-signed-out-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Check the gate first. Never read the credentials key, the bearer token, or the Keychain.
```

## Phase 5

- [x] **05 — Phone resolves staged v4 rows (gated)**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/completed/v4-signed-out-carryover/05-mobile-carryover-resolve.md

Follow .llm/plans/active/v4-signed-out-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Check the gate first. Blocked ids never become Add by RSS feeds. Do not run tests.
```

## Phase 6

- [ ] **06 — Continue Migration screen (gated)**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-signed-out-carryover/06-continue-migration-screen.md

Follow .llm/plans/active/v4-signed-out-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Check the gate first. The screen paints with no network request. Do not run tests.
```

## Phase 7

- [ ] **07 — Docs and close (last)**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/v4-signed-out-carryover/07-docs-and-close.md

Follow .llm/plans/active/v4-signed-out-carryover/00-EXECUTION-ORDER.md § Rules for every prompt.
Archive the set, then end with the cumulative verification from 00-EXECUTION-ORDER.md exactly as
written, with its tab labels.
```
