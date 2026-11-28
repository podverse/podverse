# 418 — API reference pages do not load a third-party script

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

The first turn asks a question and stops. Answer in that same chat.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 418-api-docs-exposure`. It stops at the question;
resume that agent with the answer.

## Phase 1

- [x] **01 — Vendor Swagger UI and close anonymous management docs**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/418-api-docs-exposure/01-docs-exposure.md

Stay in this checkout on the current branch. Do not create a worktree.

Ask the operator question in the plan and stop this turn before any product edit.
Do not choose the answer. Under plan-runner, report RUNNER-STATUS: BLOCKED with the
question. When the operator answers, continue in this chat and implement that answer.

Before the first product edit, search open issues again for API docs exposure. If a
different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply that matches
the answer, move this directory to .llm/plans/completed/418-api-docs-exposure/, and end
with the Root tab commands below plus fish-safe git commands. Say that posting the reply
and closing issue 418 waits until the change is on develop. Do not run gh issue comment
or gh issue close.

Root tab:

npm run test -w @podverse/api -- src/lib/docs/registerSwaggerDocs.test.ts
npm run test -w @podverse/management-api -- src/lib/docs
```

If the management docs test landed in an integration file instead, name that file and
give its command. Integration tests need `make test_deps` from the Root tab when the
test database and Valkey are not already up.
