# 419 — Session tokens accept only HS256

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/419-session-jwt-hs256/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompt below when you
want to read the result yourself.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 419-session-jwt-hs256`. It stops at the first blocker;
see the plan-runner README to resume.

## Phase 1

- [x] **01 — Pin session JWT to HS256**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/419-session-jwt-hs256/01-pin-hs256.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for session JWT algorithm
pinning. If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/419-session-jwt-hs256/, and end with the Root tab
command below plus fish-safe git commands. Say that posting the reply and closing
issue 419 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/api -- src/lib/auth/sessionTokens.test.ts
```
