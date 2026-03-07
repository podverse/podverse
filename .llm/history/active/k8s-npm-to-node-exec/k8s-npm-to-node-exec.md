# K8s & Docker: Replace npm with direct node execution

## Problem

K8s deployments used `npm start` / `npm run <script>` as the container command.
Combined with `readOnlyRootFilesystem: true` and `USER node`, npm could not
write debug logs to `/home/node/.npm/_logs/`, causing a secondary error on any
failure. The primary failure for the API was "Missing script: start" because
the root `package.json` at WORKDIR `/opt` has no `start` script (the script
lives in `apps/api/package.json`).

Running `node` directly matches the Dockerfile `CMD` already defined in each
app's Dockerfile and eliminates the npm wrapper process entirely.

### Session 1 - 2026-03-03

#### Prompt (Developer)

Fix `npm error Missing script: "start"` on the podverse-alpha-api by switching
K8s and Docker Compose commands from npm to direct node execution.

#### Key Decisions

- Use `node <path>` instead of `npm start` / `npm run` in all K8s deployments
  and alpha Docker Compose templates.
- Worker commands translated from npm script names to their underlying
  `node apps/workers/dist/index.js <subcommand> [args]` equivalents.
- Alpha Docker Compose templates updated for consistency even though they don't
  use `readOnlyRootFilesystem`.

#### Files Modified

- `infra/k8s/base/api/deployment.yaml`
- `infra/k8s/base/management-api/deployment.yaml`
- `infra/k8s/base/workers/parser-normal.deployment.yaml`
- `infra/k8s/base/workers/parser-ondemand.deployment.yaml`
- `infra/k8s/base/workers/parser-live.deployment.yaml`
- `infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml`
- `infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml`
- `infra/k8s/base/workers/listener-live.deployment.yaml`
- `infra/k8s/base/workers/image-shrink-consumer.deployment.yaml`
- `infra/k8s/base/workers/consumer-dlq.deployment.yaml`
- `infra/docker/alpha/api/docker-compose.yml.template`
- `infra/docker/alpha/management-api/docker-compose.yml.template`

### Session 2 - 2026-03-06

#### Prompt (Developer)

Fix the infra/k8s/base cron manifests that still run npm scripts and trigger
"Missing script" errors.

#### Key Decisions

- Replace `npm run <script>` with direct `node apps/workers/dist/index.js`
  commands to align with workers deployments and avoid npm log writes.

#### Files Modified

- `infra/k8s/base/cron/worker-recent-feeds.cronjob.yaml`
- `infra/k8s/base/cron/worker-delete-outdated.cronjob.yaml`
- `infra/k8s/base/cron/worker-generate-reports.cronjob.yaml`
- `infra/k8s/base/cron/worker-archive-all.cronjob.yaml`
- `infra/k8s/base/cron/worker-image-shrink-source-prune.cronjob.yaml`
- `infra/k8s/base/cron/worker-image-shrink-backfill.cronjob.yaml`
- `infra/k8s/base/cron/worker-image-shrink-orphan-cleanup.cronjob.yaml`
- `infra/k8s/base/cron/worker-dead-feeds-merge.cronjob.yaml`
