# 420 — Cookie-authenticated writes require a same-site header

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 420-cookie-write-header`. It stops at the first blocker;
see the plan-runner README to resume.

## Phase 1

- [x] **01 — Require a header on cookie writes**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/420-cookie-write-header/01-cookie-write-header.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for cookie-authenticated write
protection. If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/420-cookie-write-header/, and end with the Root tab
commands below plus fish-safe git commands. Say that posting the reply and closing
issue 420 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/http-request-core
npm run test -w @podverse/helpers -- src/lib
npm run test:e2e:api
```

Narrow the API command to the auth integration files you changed if the full API suite
is more than this issue needs. Name the files in the final message. API integration tests
need the test database and Valkey (`make test_deps` from the Root tab when they are not
already up).
