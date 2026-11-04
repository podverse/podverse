# Silence expected scale-to-zero for keyvaldb GUI — COPY-PASTA

Summary: [00-SUMMARY.md](00-SUMMARY.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above the fence).
1. Copy the fenced block only, paste into a chat in this worktree's window, and let it run.
1. Tick the box when the prompt is done.

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run 379-keyvaldb-gui-scaled-zero`. It stops at the first blocker; see
the plan-runner README to resume.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/379-keyvaldb-gui-scaled-zero/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompt below instead when you
want to read the result yourself.

One phase, one prompt. Fast stays off.

| Phase | Prompts | Model and reasoning | Why |
| --- | --- | --- | --- |
| 1 | 01 | Cursor Grok 4.7 high | PromQL, allowlist, and GitOps patch with a precise plan |

## Phase 1

- [x] **01 — Opt-out label, PromQL unless, allowlist; then close the set**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/379-keyvaldb-gui-scaled-zero/01-expected-replicas-opt-out.md

Follow 00-SUMMARY.md and 00-EXECUTION-ORDER.md. Do not label worker-image-shrink-consumer.
Do not run kubectl. Do not post to the GitHub issue.

If a product choice is still open, stop and ask. Draft the ticket reply into
proposed-reply.md and repeat it in a fenced text block in your final message; do not post it.

Do not run tests during agent work. Append the plan's release scratchpad entry to
release-notes/scratchpad.md.

Then close the set. Move 01-expected-replicas-opt-out.md, 00-SUMMARY.md,
00-EXECUTION-ORDER.md, COPY-PASTA.md, and proposed-reply.md to
.llm/plans/completed/379-keyvaldb-gui-scaled-zero/, and remove the empty
active/379-keyvaldb-gui-scaled-zero/ directory.

End with the cumulative verification for the whole set. One fenced bash block per tab,
fish-safe, labeled with the tab name. Do not put leave-running commands in the blocks.

Root (this worktree):
nix shell nixpkgs#prometheus.cli -c promtool check rules infra/k8s/base/monitoring/podverse.rules.yaml infra/k8s/base/monitoring/workloads.rules.yaml
nix shell nixpkgs#prometheus.cli -c promtool test rules infra/k8s/base/monitoring/rules.test.yaml
```
