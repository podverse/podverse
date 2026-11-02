# 03 — Manual mqRSSAddAll job (issue 320)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

GitHub: https://github.com/podverse/podverse/issues/320

One change: an operator recovering from an ingestion stall can create a one-off Job for
`mqRSSAddAll` from a manifest. The queue name is visible, and force-parse stays off unless they
add the flag to that one Job.

Prompts 01 and 02 changed the parser consumer and the live listener. Do not edit either here.

## What is true in the tree

- `apps/workers/src/commands/mq/rss/addAll.ts` requires `-q`. `-f` (`args.f === ''`) force-parses
  every feed.
- `mqRSSAddAll` (`packages/mq/src/functions/mq/rss/addAll.ts`) loads every feed with
  `feedService.getAll()` and sends one message per feed. Memory and run time grow with the feed
  count.
- Nothing under `infra/k8s/` runs `mqRSSAddAll`.
- The shape to copy is `infra/k8s/base/ops/mq-rss-add-trending-podcast-index-50.cronjob.yaml`:
  `suspend: true`, `concurrencyPolicy: Forbid`, `backoffLimit: 0`, `ttlSecondsAfterFinished`,
  exit 78 fails the Job, and a top comment with the `kubectl create job --from=cronjob/...` line.
- `infra/k8s/base/ops/kustomization.yaml` lists those manifests. `infra/k8s/INFRA-K8S.md` already
  describes suspended manual CronJobs.

## Behavior

1. Add `infra/k8s/base/ops/mq-rss-add-all.cronjob.yaml` and list it in the ops kustomization next
   to the trending entries.
2. `suspend: true` with the same placeholder schedule as the trending job. The top comment says it
   is never unsuspended onto a schedule and gives
   `kubectl create job --from=cronjob/mq-rss-add-all mq-rss-add-all-$(date +%s) -n <ns>`.
3. Command: `node apps/workers/dist/index.js mqRSSAddAll -q rss-normal`. No `-f`. The comment
   directly above the command says `-f` force-parses every feed and belongs only in a one-off Job
   for that recovery, never in this manifest.
4. Copy the trending job's labels, security context, image (no tag), `envFrom`, and pod failure
   policy.
5. Because this job loads every feed into memory, set the memory limit to `2Gi` (the parser
   deployments' limit) and `activeDeadlineSeconds: 21600`. Note both in a comment.
6. In `infra/k8s/INFRA-K8S.md`, next to the other manual CronJob notes, add a short section: what
   it does, that it is suspended, the `kubectl create job` line, the `-q` queue, and that `-f` is
   the expensive switch.

## Do not

- Do not put it under `infra/k8s/base/cron/`.
- Do not set `suspend: false`.
- Do not change `mqRSSAddAll` itself.
- Do not run kustomize or touch the cluster.

## Check

The manifest is valid YAML, listed in the ops kustomization, and the doc names the same CronJob
name as the file.

## Release notes entry

Append to `release-notes/scratchpad.md`. Surfaces: k8s, ops. A suspended `mq-rss-add-all` CronJob
lets operators enqueue every feed to `rss-normal` with one `kubectl create job` after an ingestion
stall. Force-parse is opt-in for that Job only.
