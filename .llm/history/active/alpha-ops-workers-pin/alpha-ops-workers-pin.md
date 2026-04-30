# alpha-ops-workers-pin

**Started:** 2026-04-30
**Context:** Pin `ghcr.io/podverse/podverse/workers` in alpha ops Kustomize overlays so ops CronJobs do not resolve to implicit `:latest` (ImagePullBackOff).

### Session 1 - 2026-04-30

#### Prompt (Developer)

Pin workers image on ops CronJobs (ImagePullBackOff / `latest` not found)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added Kustomize `images` entry for `ghcr.io/podverse/podverse/workers` with `newTag` matching each overlay’s remote `ref=` (`5.4.18-staging.4` in podverse `infra/k8s/alpha/ops`, `5.4.20-staging.4` in `k.podcastdj.com` `apps/podverse-alpha/ops`), consistent with `cron`/`workers` overlays.
- Bumped header `Version` comments in both `kustomization.yaml` files.

#### Files Created/Modified

- `infra/k8s/alpha/ops/kustomization.yaml` (podverse monorepo)
- `k.podcastdj.com/apps/podverse-alpha/ops/kustomization.yaml` (GitOps repo, sibling workspace)
