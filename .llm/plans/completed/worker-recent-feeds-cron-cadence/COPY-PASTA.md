# COPY-PASTA — worker-recent-feeds cron cadence

## Prompt 1 — CronJob manifest hardening

- [x] **Completed**

```
Execute plan file .llm/plans/active/worker-recent-feeds-cron-cadence/01-cronjob-manifest-hardening.md
```

## Prompt 2 — Podcast Index request timeouts

- [x] **Completed**

```
Execute plan file .llm/plans/active/worker-recent-feeds-cron-cadence/02-podcast-index-request-timeouts.md
```

## Prompt 3 — Recent feeds pagination bounds

- [x] **Completed**

```
Execute plan file .llm/plans/active/worker-recent-feeds-cron-cadence/03-recent-feeds-pagination-bounds.md
```

## Verification (after all prompts)

```bash
npm run lint
npm run build:packages
npm run build -w apps/workers
npm run test:unit
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/cron/ | kubectl apply -f - --dry-run=client
kubectl -n podverse-alpha describe cronjob worker-recent-feeds
kubectl -n podverse-alpha get jobs | rg worker-recent-feeds
```

Push manifest changes to the Argo CD–tracked branch and confirm `podverse-alpha-cron` syncs. Watch
for ~30 minutes: Jobs should appear every ~5 minutes even when individual runs fail; no multi-hour
holes unless `activeDeadlineSeconds` is intentionally killing very slow runs.
