# 381 recent-feeds upstream exit — COPY-PASTA

Issue: https://github.com/podverse/podverse/issues/381

How to use:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (line above the fence).
2. Copy the fenced block only → paste into a new chat in the worktree window.
3. Tick the checkbox when the prompt is done.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 381-recent-feeds-upstream-exit`. It stops at the first blocker; see the plan-runner README to resume.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/381-recent-feeds-upstream-exit/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompt below instead when
you want to read the result yourself.

Order: [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

## Model per prompt

| Prompt | Cursor model | Reasoning | Why this tier |
| ------ | ------------ | --------- | ------------- |
| 01 | Cursor Grok 4.7 | high | Exit-code change on the recent-feeds poller; the plan locks the branch |

If a **Cursor Grok 4.7** prompt stalls or makes the same mistake twice, rerun it one reasoning
level higher. If it already ran at extra high, rerun it on **Codex 5.3**.

## Phase 1

- [x] **01 — Upstream error exits 0**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/381-recent-feeds-upstream-exit/01-upstream-error-exit.md

Follow 00-EXECUTION-ORDER.md. The product choice is closed: clean exit only, no new alert.
Draft the ticket reply into proposed-reply.md and repeat it in a fenced text block. Do not post it.
Do not run tests during agent work.

When the plan is done, append the release scratchpad entry, then move the whole
.llm/plans/active/381-recent-feeds-upstream-exit directory to .llm/plans/completed/.

Verify in the Root tab:

npm run build:packages
npm run lint
npm run test -w @podverse/external-services-podcast-index
npm run test -w @podverse/mq
```
