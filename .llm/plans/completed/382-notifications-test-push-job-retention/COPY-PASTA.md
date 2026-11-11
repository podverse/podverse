# 382 notifications test push Job retention — COPY-PASTA

How to use:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (line above the fence).
2. Copy the fenced block only → paste into one chat in this worktree → the agent executes.
3. Tick the checkbox when the prompt is done.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/382-notifications-test-push-job-retention/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompt below instead when
you want to read the result before the set closes.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 382-notifications-test-push-job-retention`. It stops at
the first blocker; see the plan-runner README to resume.

## Model per prompt

| Prompt | Cursor model | Reasoning | Why this tier |
| --- | --- | --- | --- |
| 01 | Cursor Grok 4.7 | medium | One manifest field, a comment, the scratchpad, and the ticket reply |

## Phase 1

- [ ] **01 — Keep finished notification test Jobs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/382-notifications-test-push-job-retention/01-keep-finished-jobs.md

The retention choice is settled: remove ttlSecondsAfterFinished and keep the history limits. If any other product choice is still open, stop and ask. Draft the ticket reply into proposed-reply.md and repeat it in a fenced text block. Do not post it. Do not run tests.

When the plan is done, move .llm/plans/active/382-notifications-test-push-job-retention/ to .llm/plans/completed/382-notifications-test-push-job-retention/.

End with these operator commands. Label the tab Root. Do not run them.

kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/ops | awk 'BEGIN{RS="---\n"} /name: ops-notifications-test-push/{print; exit}'
```
