# 421 — GitHub Actions run from pinned commits

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/421-actions-pin-sha/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompt below when you
want to read the result yourself.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 421-actions-pin-sha`. It stops at the first blocker;
see the plan-runner README to resume.

## Phase 1

- [x] **01 — Pin workflow actions to commits**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/421-actions-pin-sha/01-pin-action-shas.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for pinning GitHub Actions to
commits. If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/421-actions-pin-sha/, and end with fish-safe git
commands. There is no verification command. Say that posting the reply and closing
issue 421 waits until the change is on develop. Do not run gh issue comment or
gh issue close.
```
