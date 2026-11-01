# CronJob health and alerting — COPY-PASTA

Summary: [00-SUMMARY.md](00-SUMMARY.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Execution rules

Phases run in order. Prompts under one phase heading edit disjoint files and may run at once. Wait
for every prompt in a phase to finish before starting the next phase. Only prompt 06 edits docs and
the release scratchpad; earlier prompts put that text in their final message.

Notifications go to **ntfy only**, with no chat bot or LLM agent in any alert path. Prompts 04 and
05 ran before Matrix was dropped; prompt 07 removes Matrix from their output.

| Prompt | Model | Reasoning | Why |
| --- | --- | --- | --- |
| 01 | Cursor Grok 4.7 | high | Mechanical manifest edits from a table, plus a small check script |
| 03 | Cursor Grok 4.7 | high | Standard manifests; must look up current versions |
| 05 | Codex 5.3 | high | Exact Argo CD notifications fields and ntfy headers |
| 02 | Codex 5.3 | high | Exact kube-state-metrics names and PromQL, with rule tests |
| 04 | Codex 5.3 | high | Alertmanager routing and ntfy config must be exact |
| 07 | Codex 5.3 | high | Exact Alertmanager routing, ntfy priority mechanism, Argo CD templates |
| 06 | Cursor Grok 4.7 | medium | Docs assembly, scratchpad, archive |

## How to use

1. Select the model and reasoning in the Cursor UI, paste the fence, and let it run.
1. Phase 1: three agents at once. Phase 2: two agents at once. Phases 3 and 4: one each.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs cron-health-alerting --parallel`. It stops at the first
blocker; see the plan-runner README to resume.

## Phase 1

- [x] **01 — CronJob deadlines, labels, fail-fast, contract check**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/cron-health-alerting/01-cron-deadlines-labels-contract.md

Never set spec.suspend. Other prompts run at the same time: edit only the files your plan lists.
Put doc text under "Docs for 06" and your release-notes entry under "Release notes entry" in your
final message.

Do not run tests during agent work.
```

- [x] **03 — Example: kube-state-metrics, Prometheus snippet, cluster rules**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/cron-health-alerting/03-kube-state-metrics-example.md

Placeholders only; this repo is public. Edit only the files your plan lists. Put doc text under
"Docs for 06" and your release-notes entry under "Release notes entry" in your final message.

Do not run tests during agent work.
```

- [x] **05 — Example: Argo CD notifications (ran with Matrix, since dropped; 07 removes it)**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/cron-health-alerting/05-argocd-notifications-example.md

Placeholders only; this repo is public. Edit only the files your plan lists. Put doc text under
"Docs for 06" and your release-notes entry under "Release notes entry" in your final message.

Do not run tests during agent work.
```

## Phase 2

- [x] **02 — Podverse alert rules**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/cron-health-alerting/02-podverse-alert-rules.md

Builds on 01's podverse-schedule label and podFailurePolicy. Look up kube-state-metrics metric
names for the version 03 pinned; do not guess. Edit only the files your plan lists. Put doc text
under "Docs for 06" and your release-notes entry under "Release notes entry" in your final message.

Do not run tests during agent work.
```

- [x] **04 — Example: Alertmanager (ran with Matrix, since dropped; 07 removes it)**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/cron-health-alerting/04-alertmanager-matrix-example.md

Placeholders only; this repo is public. Edit only the files your plan lists. Put doc text under
"Docs for 06" and your release-notes entry under "Release notes entry" in your final message.

Do not run tests during agent work.
```

## Phase 3

- [x] **07 — ntfy as the only delivery path**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Read and execute .llm/plans/active/cron-health-alerting/07-ntfy-only-delivery.md

Placeholders only; this repo is public. Topic names never go in git. Edit only the files your plan
lists. Put doc text under "Docs for 06" and your release-notes entry under "Release notes entry" in
your final message.

Do not run tests during agent work.
```

## Phase 4

- [x] **06 — Docs, adoption checklist, close**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/cron-health-alerting/06-docs-adoption-close.md

Collect "Docs for 06" and "Release notes entry" from 01, 02, 03, and 07 (use 07's text instead of
04's and 05's), write the docs, append the scratchpad, archive the set, and end with the plan's
verification block.
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
