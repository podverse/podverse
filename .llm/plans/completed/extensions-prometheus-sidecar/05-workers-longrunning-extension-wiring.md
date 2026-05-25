# Plan 05 — Workers (long-running) extension wiring

## Objective

Integrate extension-prometheus sidecar + OTEL SDK for **Deployment-only** workers; leave CronJobs unchanged.

---

## 1. In-scope Deployments (8)

From [infra/k8s/base/workers/kustomization.yaml](infra/k8s/base/workers/kustomization.yaml):

| File | Command |
| ---- | ------- |
| `consumer-dlq.deployment.yaml` | `mqRSSRunDlqConsumer` |
| `image-shrink-consumer.deployment.yaml` | `imageShrinkRunConsumer` |
| `listener-live.deployment.yaml` | `mqRSSRunLiveItemListener` |
| `parser-add-by-rss-ondemand.deployment.yaml` | `mqAddByRSSRunParser` |
| `parser-add-by-rss-ondemand-background.deployment.yaml` | `mqAddByRSSRunParser` |
| `parser-live.deployment.yaml` | `mqRSSRunParser` |
| `parser-normal.deployment.yaml` | `mqRSSRunParser` |
| `parser-ondemand.deployment.yaml` | `mqRSSRunParser` |

**Out of scope:** everything under `infra/k8s/base/cron/`.

---

## 2. Code changes

### [apps/workers/src/index.ts](apps/workers/src/index.ts)

1. After `validateStartupRequirements(commandName)`:
   - `initExtensions(...)` when `EXT_PROMETHEUS_ENABLED` and `longRunningCommands.has(commandName)`
2. Wrap `await command(args)`:

```typescript
const start = performance.now();
let status: 'success' | 'error' = 'success';
try {
  await command(args);
} catch (e) {
  status = 'error';
  throw e;
} finally {
  recordWorkerCommand(commandName, status, performance.now() - start);
}
```

3. `shutdownExtensions()` on SIGTERM before exit (long-running processes).

### Config

- [apps/workers/src/config/index.ts](apps/workers/src/config/index.ts) — `extensions.prometheus`, `extensions.otel`
- [apps/workers/src/lib/startup/validation.ts](apps/workers/src/lib/startup/validation.ts) — Extensions block last

### Dependencies

- Add `@podverse/extension-sdk`
- Remove any future `prom-client` if added
- Do **not** start in-process metrics HTTP server (sidecar only)

---

## 3. K8s changes (per Deployment)

Apply from plan 04:

- `envFrom: podverse-extensions-config`
- Sidecar container `extension-prometheus`
- Pod annotations for Prometheus scrape
- Optional per-Deployment patch for `EXT_OTEL_SERVICE_NAME`:

  `podverse-worker-parser-ondemand`, `podverse-worker-dlq`, etc.

### Probes

Keep existing `pidof node` liveness on **main** container.  
Sidecar uses HTTP `/extensions/prometheus/health`.

---

## 4. Docker

- [infra/docker/local/workers/docker-compose.yml](infra/docker/local/workers/docker-compose.yml) — optional second service under profile (plan 08)
- Workers Dockerfile: include `extension-sdk` in build; exclude `prom-client`

---

## 5. Parser “slow host” metrics (v2 note)

v1: **command-level** duration only.  
v2 (optional): histogram with `feed_host` label gated by `EXT_PROMETHEUS_FEED_HOST_LABELS=true` — document in EXTENSIONS.md, not implemented in v1.

---

## 6. Verification

```bash
./scripts/nix/with-env npm run build -w apps/workers
# K8s dry-run manifest includes sidecar when extensions overlay on
kubectl apply --dry-run=client -k infra/k8s/alpha/workers/  # if overlay exists
```

Staging smoke:

1. Enable extensions ConfigMap
2. Scale parser deployment
3. Scrape `podIP:9464/extensions/prometheus/metrics`
4. Confirm `podverse_worker_command_duration_seconds` (or OTEL-translated name) present

---

## 7. Acceptance checklist

- [ ] All 8 Deployments patched
- [ ] CronJobs untouched
- [ ] SDK init only for long-running commands
- [ ] No `prom-client` in workers package.json
- [ ] SIGTERM flushes OTLP
