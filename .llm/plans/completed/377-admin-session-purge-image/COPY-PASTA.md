# Pin admin session purge CronJob image — COPY-PASTA

Summary: [00-SUMMARY.md](00-SUMMARY.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above the fence).
1. Copy the fenced block only, paste into a chat in this worktree's window, and let it run.
1. Tick the box when the prompt is done.

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run 377-admin-session-purge-image`. It stops at the first blocker; see
the plan-runner README to resume.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/377-admin-session-purge-image/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompt below instead when you
want to read the result yourself.

One phase, one prompt. Fast stays off.

| Phase | Prompts | Model and reasoning | Why |
| --- | --- | --- | --- |
| 1 | 01 | Cursor Grok 4.7 medium | Mechanical kustomization and script edit with a precise plan |

## Phase 1

- [x] **01 — Pin management-api on the cron overlay; then close the set**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/377-admin-session-purge-image/01-pin-management-api-cron-image.md

Follow 00-SUMMARY.md and 00-EXECUTION-ORDER.md. Do not edit the base CronJob manifest. Do not
change activeDeadlineSeconds or backoffLimit. Do not run kubectl. Do not post to the GitHub
issue.

If a product choice is still open, stop and ask. Draft the ticket reply into
proposed-reply.md and repeat it in a fenced text block in your final message; do not post it.

Do not run tests during agent work. Append the plan's release scratchpad entry to
release-notes/scratchpad.md.

Then close the set. Move 01-pin-management-api-cron-image.md, 00-SUMMARY.md,
00-EXECUTION-ORDER.md, COPY-PASTA.md, and proposed-reply.md to
.llm/plans/completed/377-admin-session-purge-image/, and remove the empty
active/377-admin-session-purge-image/ directory.

End with the cumulative verification for the whole set. One fenced bash block per tab,
fish-safe, labeled with the tab name. Do not put leave-running commands in the blocks.

Root (this worktree):
bash infra/k8s/scripts/check_cronjob_contract.sh

Root (k.podcastdj.com checkout):
bash ./scripts/check_podverse_alpha_version_contract.sh
```
