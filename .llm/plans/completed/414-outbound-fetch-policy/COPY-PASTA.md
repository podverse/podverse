# 414 — Untrusted server fetches use one outbound policy

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 414-outbound-fetch-policy`. It stops at the first blocker;
see the plan-runner README to resume.

## Phase 1

- [x] **01 — One outbound policy for untrusted fetches**

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/414-outbound-fetch-policy/01-one-outbound-policy.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for untrusted outbound fetches.
If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/414-outbound-fetch-policy/, and end with the Root tab
commands below plus fish-safe git commands. Say that posting the reply and closing
issue 414 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/helpers-requests
npm run test -w @podverse/web -- src/app/api/proxy
npm run test -w @podverse/web -- src/utils/media/resolveMediaRedirect.test.ts
npm run test -w @podverse/workers
```
