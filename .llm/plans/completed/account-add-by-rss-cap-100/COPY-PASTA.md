# COPY-PASTA — Add by RSS limit

Request: [00-REQUEST.md](00-REQUEST.md). The specification:
[01-enforce-add-by-rss-tier.md](01-enforce-add-by-rss-tier.md). Verification:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

Start only after `add-by-rss-directory-match`, `v4-flagged-feed-block`, and
`v4-signed-out-carryover` prompt 03 are complete.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run account-add-by-rss-cap-100`.
Resume with `./scripts/abcplan/run.sh run account-add-by-rss-cap-100 --resume 'Your answer.'`

The prompt does not run tests. The operator runs the cumulative verification after it.

## Phase 1

- [x] **01 — Enforce the Add by RSS tier**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/account-add-by-rss-cap-100/01-enforce-add-by-rss-tier.md

Follow .llm/plans/active/account-add-by-rss-cap-100/00-EXECUTION-ORDER.md § Rules.
Append the scratchpad entry. Archive the set, then end with the cumulative verification from
00-EXECUTION-ORDER.md, narrowed to the test files you added. Do not run those commands.
Do not commit.
```
