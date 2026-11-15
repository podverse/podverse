# COPY-PASTA — Follow limit

Request: [00-REQUEST.md](00-REQUEST.md). The specification:
[01-enforce-follow-tier.md](01-enforce-follow-tier.md). Verification:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

Start only after `account-add-by-rss-cap-100` is complete.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run account-follow-cap-500`.
Resume with `./scripts/abcplan/run.sh run account-follow-cap-500 --resume 'Your answer.'`

The prompt does not run tests. The operator runs the cumulative verification after it.

## Phase 1

- [x] **01 — Enforce the follow tier**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/account-follow-cap-500/01-enforce-follow-tier.md

Follow .llm/plans/active/account-follow-cap-500/00-EXECUTION-ORDER.md § Rules.
Append the scratchpad entry. Archive the set, then end with the cumulative verification from
00-EXECUTION-ORDER.md, narrowed to the test files you added. Do not run those commands.
Do not commit.
```
