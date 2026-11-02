# Ingestion stall — issues 318, 319, 320

Three prompts on one branch (`feature/318-parser-consumer-timeout`), one at a time. Each phase must
finish before the next starts. The operator commits after each prompt so the branch has one commit
per issue. Tests run once, after prompt 03.

| Prompt | Issue | Model | Reasoning | Why |
| --- | --- | --- | --- | --- |
| 01 | 318 parser consumer timeout | Opus 5.5 | high | Process lifecycle, message settlement, probe contract |
| 02 | 319 live listener liveness | Opus 5.5 | high | Socket and timer races |
| 03 | 320 manual mqRSSAddAll job | Cursor Grok 4.7 | medium | One manifest and a doc section |

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run ingestion-stall`

## Phase 1

- [x] **01 — Parser consumer timeout**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/ingestion-stall/01-parser-consumer-timeout.md

Do not run tests during agent work.

End with what changed and a copy-paste commit command for the operator (Root tab), message starting "Bound parser consumer handlers at 15 minutes (#318)". Do not commit.
```

## Phase 2

- [x] **02 — Live item listener liveness**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/ingestion-stall/02-live-listener-liveness.md

Do not run tests during agent work.

End with what changed and a copy-paste commit command for the operator (Root tab), message starting "Reconnect a silent Podping socket (#319)". Do not commit.
```

## Phase 3

- [x] **03 — Manual mqRSSAddAll job**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/ingestion-stall/03-mq-rss-add-all-job.md

Do not run tests during agent work.

When the change is done, move every remaining file in .llm/plans/active/ingestion-stall/ into the existing .llm/plans/completed/ingestion-stall/ (do not nest a second ingestion-stall folder), then remove the empty active directory.

End with a copy-paste commit command for the operator (Root tab), message starting "Add suspended mq-rss-add-all CronJob (#320)". Do not commit.

Then end with this cumulative verification for the whole set, Root tab, from the worktree root. Do not run it:

npm run build:packages
npm run test -w @podverse/mq -- src/services/activeMQArtemis src/functions/mq/rss/runLiveItemListener.test.ts
npm run test -w @podverse/orm -- src/services/feed
npm run test -w apps/workers
npm run type-check -w @podverse/mq
npm run type-check -w apps/workers
npm run lint:changed
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/workers
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/ops

Say that the probe and CronJob changes reach a cluster only after the GitOps branch is pushed.
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
