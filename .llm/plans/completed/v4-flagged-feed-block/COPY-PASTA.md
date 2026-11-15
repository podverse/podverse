# COPY-PASTA — v4 flagged feed block

Request: [00-REQUEST.md](00-REQUEST.md). Phase order and the cumulative verification:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

Start only after `add-by-rss-directory-match` is complete, and after the local rehearsal parsers
finish. These prompts do not start parsers, do not run the import, and do not commit.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run v4-flagged-feed-block`.
It runs one prompt per phase and stops at the first blocker. Resume with
`./scripts/abcplan/run.sh run v4-flagged-feed-block --resume 'Your answer.'`

To run by hand: one Cursor window, **Cursor Grok 4.7**, Fast off, reasoning **high**. Paste a
prompt, wait until it finishes, then the next.

Prompts do not run tests. The operator runs the cumulative verification after prompt 02.

## Phase 1

- [x] **01 — Import v4 spam and takedown blocks**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-flagged-feed-block/01-import-v4-flag-blocks.md

Follow .llm/plans/active/v4-flagged-feed-block/00-EXECUTION-ORDER.md § Rules for every prompt.
Do not run v4ImportFlaggedFeeds. Do not run tests. Do not commit.
```

## Phase 2

- [x] **02 — Refuse a blocked feed on every entry path**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-flagged-feed-block/02-refuse-blocked-feed-entry.md

Follow .llm/plans/active/v4-flagged-feed-block/00-EXECUTION-ORDER.md § Rules for every prompt.
Keep the blocked-feed check before any directory match in the Add by RSS follow controller.
Append the scratchpad entry in the plan. Archive the set, then end with the cumulative
verification from 00-EXECUTION-ORDER.md. Do not run those commands. Do not commit.
```
