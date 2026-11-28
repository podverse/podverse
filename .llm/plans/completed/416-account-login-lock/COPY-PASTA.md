# 416 — Dropped

Issue 416 is closed. Do not paste the prompt below. No product change.

# 416 — An account locks after repeated failed passwords

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

The first turn asks a question and stops. Answer in that same chat. Accepting the
recommendation in the plan is a complete answer.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 416-account-login-lock`. It stops at the question;
resume that agent with the answer.

## Phase 1

- [ ] **01 — Lock an account after repeated failed passwords**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/416-account-login-lock/01-login-lock.md

Stay in this checkout on the current branch. Do not create a worktree.

Ask the operator questions in the plan and stop this turn before any product edit.
Do not treat the recommendation as accepted until the operator says so. Under
plan-runner, report RUNNER-STATUS: BLOCKED with the questions. When the operator
answers, continue in this chat and implement that answer.

Before the first product edit, search open issues again for account login lock. If a
different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/416-account-login-lock/, and end with the Root tab
command below plus fish-safe git commands. Say that posting the reply and closing
issue 416 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/api -- src/test/auth.test.ts
```

That test needs the test database and Valkey. From the Root tab, run `make test_deps`
when they are not already up.
