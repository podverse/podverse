# 417 — An account can require a second factor at login

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

The first turn asks questions and stops. Answer in that same chat. There is no default
to build if you skip the questions.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 417-second-factor`. It stops at the questions;
resume that agent with the answers.

## Phase 1

- [x] **01 — Second factor at login, after the operator chooses it**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/417-second-factor/01-second-factor.md

Stay in this checkout on the current branch. Do not create a worktree.

Ask the operator questions in the plan and stop this turn before any product edit.
Do not choose the factor, the surfaces, or the recovery path. Under plan-runner,
report RUNNER-STATUS: BLOCKED with the questions. When the operator answers, continue
in this chat and implement that answer. If they decline the work, stop, leave this
directory in active/, and leave issue 417 open.

Before the first product edit, search open issues again for a second login factor. If a
different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When product code shipped, write proposed-reply.md from the plan's Ticket reply, move
this directory to .llm/plans/completed/417-second-factor/, and end with the verification
commands for the tests you added plus fish-safe git commands. Label the Root tab for API
and web commands. Label Mobile Maestro for a mobile flow, and do not paste leave-running
Metro commands into that block. Say that posting the reply and closing issue 417 waits
until the change is on develop. Do not run gh issue comment or gh issue close.
```
