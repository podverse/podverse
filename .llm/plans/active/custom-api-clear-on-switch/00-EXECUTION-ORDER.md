# Execution order — Clear the phone when the custom API address changes

## Rules for every prompt

- Stay on the current branch. Do not create a worktree. Do not commit.
- Do not run tests, lint, or Maestro. The last prompt's final message gives the operator those commands.
- Do not send a request to the previous server or the new server during the clear. The health probe already ran, and it stays unauthenticated.
- Follow the locked decisions in `01-clear-on-api-switch.md`. Do not reopen them.

## Phase 1

- 01 — Clear on API switch. One prompt. It owns every file in that plan.
