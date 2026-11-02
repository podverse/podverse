# Feed poller catch-up — COPY-PASTA

Summary: [00-SUMMARY.md](00-SUMMARY.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Execution rules

Phases run in order. Prompts under one phase heading edit disjoint files and may run at once. Wait
for every prompt in a phase to finish before starting the next phase.

| Prompt | Model | Reasoning | Why |
| --- | --- | --- | --- |
| 01 | Opus 5.5 | high | Migration, cursor semantics, at-least-once delivery |
| 03 | Cursor Grok 4.7 | extra high | Credentials scope in startup validation |
| 02 | Opus 5.5 | high | Change detection against a third-party API, resumable sweep |
| 04 | Opus 5.5 | high | Reads manifests and validators together; must not duplicate key lists |
| Close | Cursor Grok 4.7 | low | Scratchpad append, archive, verification |

## How to use

1. Select the model and reasoning in the Cursor UI, paste the fence, and let it run.
1. Phase 1: two agents at once. Phase 2: two agents at once. Then Close.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs feed-poller-catchup --parallel`. It stops at the first
blocker; see the plan-runner README to resume.

## Phase 1

- [x] **01 — Poller cursor**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/feed-poller-catchup/01-poller-cursor.md

The poller saves its Podcast Index /recent/data position in the app database and resumes from it.
Other prompts run at the same time: edit only the files your plan lists, and put your release-notes
entry in your final message under "Release notes entry" instead of writing the scratchpad.

Do not run tests during agent work.
```

- [x] **03 — Workers Add by RSS key scope**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/feed-poller-catchup/03-workers-add-by-rss-key-scope.md

Only commands that seal or open Add by RSS credentials require the key. Edit only the files your
plan lists, and put your release-notes entry in your final message under "Release notes entry".

Do not run tests during agent work.
```

## Phase 2

- [x] **02 — Gap catch-up sweep**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/feed-poller-catchup/02-poller-gap-sweep.md

Builds on prompt 01's cursor. Prompt 04 runs at the same time and owns apps/workers/src/index.ts and
apps/workers/src/lib/startup/** except your new command's entry in categoriesForCommand.ts. Edit
only the files your plan lists, and put your release-notes entry in your final message under
"Release notes entry".

Do not run tests during agent work.
```

- [x] **04 — Exit code 78 and k8s env contract test**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/feed-poller-catchup/04-startup-config-exit-and-env-contract.md

Startup config failures exit 78; a unit test proves every CronJob and worker Deployment mounts the
env its command validates. Prompt 02 runs at the same time and adds one command entry to
categoriesForCommand.ts; leave that entry alone. Edit only the files your plan lists, and put your
release-notes entry in your final message under "Release notes entry".

Do not run tests during agent work.
```

## Close

- [x] **Close — scratchpad, archive, verification**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** low

```
Close the plan set .llm/plans/active/feed-poller-catchup/.

1. Append to release-notes/scratchpad.md every "Release notes entry" from the final messages of
   prompts 01–04 (saved under .artifacts/plan-runner/feed-poller-catchup/ when run by plan-runner;
   otherwise ask the operator to paste them). Keep each as its own entry.
2. Move the set to .llm/plans/completed/feed-poller-catchup/ per the plan-completion skill.
3. End with this verification block for the operator (Root tab), unchanged:

npm run build:packages
npm run test -w @podverse/external-services-podcast-index
npm run test -w @podverse/mq
npm run test -w @podverse/orm
npm run test -w @podverse/workers
make db_verify_linear_baseline
npm run test:e2e:api
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
