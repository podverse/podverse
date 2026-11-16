# COPY-PASTA — Clear the phone when the custom API address changes

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Order:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

Stay on this branch. One prompt. It owns every file in the plan.

**Root** tab:

```bash
./scripts/abcplan/run.sh run custom-api-clear-on-switch
```

First time on this computer: `npm --prefix ../plan-runner install`, then
`node ../plan-runner/run-plan-set.mjs --login`.

If the step stops with a question, answer it in a chat of this window, then resume in **Root**:

```bash
./scripts/abcplan/run.sh run custom-api-clear-on-switch --resume 'Your answer.'
```

## Phase 1

- [ ] **01 — Clear on API switch**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/custom-api-clear-on-switch/01-clear-on-api-switch.md

Follow .llm/plans/active/custom-api-clear-on-switch/00-EXECUTION-ORDER.md § Rules for every prompt.
This is the only prompt. Do not run tests. Append the scratchpad entry, move the set to
.llm/plans/completed/custom-api-clear-on-switch/, and put the verification commands from the
plan's Close section in your final message. Do not commit.
```
