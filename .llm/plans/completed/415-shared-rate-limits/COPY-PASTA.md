# 415 — Won't do

Issue 415 is closed. Do not paste the prompt below. No product change. Rate-limit counters
stay in process memory.

# 415 — HTTP rate limits share one counter

The text below is the original plan. The decision above is the one to follow.

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

The first turn asks a question and stops. Answer in that same chat.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 415-shared-rate-limits`. It stops at the question;
resume that agent with the answer.

## Phase 1

- [ ] **01 — Share rate-limit counters and trust one proxy hop**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/415-shared-rate-limits/01-shared-counters.md

Stay in this checkout on the current branch. Do not create a worktree.

Ask the operator questions in the plan and stop this turn before any product edit.
Do not guess a hop count. Under plan-runner, report RUNNER-STATUS: BLOCKED with the
questions. When the operator answers, continue in this chat and implement that answer.

Before the first product edit, search open issues again for shared rate limits. If a
different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/415-shared-rate-limits/, and end with the Root tab
commands below plus fish-safe git commands. Say that posting the reply and closing
issue 415 waits until the change is on develop. Do not run gh issue comment or
gh issue close. Remind the operator to push the GitOps env change with the app change.

Root tab:

npm run test -w @podverse/api -- src/lib/rateLimiter.ts
npm run test -w @podverse/web -- src/utils/proxy
npm run test -w @podverse/api -- src/test/auth.test.ts
```

`auth.test.ts` needs the test database and Valkey. From the Root tab, run `make test_deps`
when they are not already up. If the rate-limiter test file has a different name, give
that command instead.
