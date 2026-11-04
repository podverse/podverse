# Recent-feeds page timeout — COPY-PASTA

One phase, one prompt. Fast stays off. Run it in this checkout on the current branch.

## How to use

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above the fence).
1. Copy the fenced block only, paste into a chat in this window, and let it run.
1. Tick the box when the prompt is done.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 378-recent-feeds-timeout`. It stops at the first blocker; see
the plan-runner README to resume.

| Phase | Prompts | Model and reasoning | Why |
| --- | --- | --- | --- |
| 1 | 01 | Codex 5.3 high | Retry contract and tests across two packages |

## Phase 1

- [x] **01 — Page deadline, retry, clean stop; then close the set**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/378-recent-feeds-timeout/01-recent-feeds-page-timeout.md

Leave failedJobsHistoryLimit at 5. Do not edit CronJob manifests. Do not change
DEFAULT_HTTP_TIMEOUT_MS. Do not post to the GitHub issue.

If a product choice is still open, stop and ask. Draft the ticket reply into
proposed-reply.md and repeat it in a fenced text block in your final message; do not post it.

Do not run tests during agent work. Append the plan's release scratchpad entry to
release-notes/scratchpad.md.

Then close the set. Move 01-recent-feeds-page-timeout.md, COPY-PASTA.md, and
proposed-reply.md to .llm/plans/completed/378-recent-feeds-timeout/, and remove the empty
active/378-recent-feeds-timeout/ directory.

End with the cumulative verification for the whole set. One fenced bash block, fish-safe,
labeled with the tab name.

Root:
npm run test -w @podverse/external-services-podcast-index
npm run test -w @podverse/mq
```
