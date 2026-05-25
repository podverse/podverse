# Plan 09 — Testing and rollout strategy

## Objective

Define test coverage, staged rollout, and removal of legacy in-process Prometheus so production cutover is safe.

---

## 1. Test pyramid

| Layer | Scope | Command |
| ----- | ----- | ------- |
| Unit | extension-sdk init, path normalize, disabled no-op | `npm run test -w @podverse/extension-sdk` |
| Unit | extension-prometheus health/metrics handlers | `npm run test -w @podverse/extension-prometheus` |
| Integration | api/management-api routes, auth unchanged | `npm run test:e2e:api` |
| Integration | prometheus app route 404 | update existing vitest files |
| Manual | Local compose profile scrape | plan 08 script |
| Staging | K8s pod scrape + Grafana panel | operator-run |

**No E2E web requirement** unless adding optional `e2e/extensions-smoke.spec.ts` (defer).

---

## 2. Test cases (required)

### SDK

- `initExtensions` with `enabled: false` → no exporter, no throw
- `initExtensions` with `enabled: true` + invalid endpoint → startup validation fails
- `normalizePathForMetricLabel` — UUID, numeric id, static path

### API

- App `GET /api/v2/extensions/prometheus/metrics` → **404** (post-migration)
- HTTP traffic with extensions on → sidecar scrape contains `http_requests` series (manual/staging)

### Workers

- Long-running command with extensions on → command duration series present
- Short command (`archiveAll` local) → SDK not initialized for OTLP (no error)

### Sidecar

- Health 200
- Metrics content-type `text/plain` compatible with Prometheus 2.x
- OTLP sample metric → appears within 15s on scrape

---

## 3. Rollout phases

| Phase | Environment | Actions |
| ----- | ----------- | ------- |
| 0 | CI | Build extension image; unit tests; kustomize build |
| 1 | Dev local | Compose profile + api dev |
| 2 | Staging K8s | `EXT_PROMETHEUS_ENABLED=true` in extensions.env overlay only |
| 3 | Staging observe | 48h: validate new OTEL-semconv dashboard set and alert behavior |
| 4 | Production | Enable shared ConfigMap; monitor scrape failures |
| 5 | Cleanup | Remove dead code paths, old TODOs, duplicate docs |

### Rollback

Set `EXT_PROMETHEUS_ENABLED=false` in single `extensions.env` and sync Argo — sidecar component removed/disabled; apps stop OTLP (no-op).

---

## 4. Operator checklist (staging → prod)

- [ ] Prometheus scrape config added for each workload type (pod SD for workers)
- [ ] NetworkPolicy allows scraper → :9464
- [ ] Alerts: `up{job="podverse-extension-prometheus"} == 0`
- [ ] Dashboards updated with new scrape paths (not app :3000 metrics)
- [ ] Image `extension-prometheus` pinned in alpha overlays

---

## 5. Legacy removal checklist

| Item | Remove when |
| ---- | ----------- |
| `apps/api/.../prometheusExporter.ts` | Phase 7 complete |
| `registerPrometheusRoutes` | Phase 7 complete |
| `prom-client` in api/management-api package.json | Phase 7 complete |
| old metrics route compatibility aliases | Not implemented (hard cutover policy) |
| `TODO(extensions-migration)` comments | Final PR |
| Docs stating "baked-in prom-client" | Update PROMETHEUS + EXTENSIONS docs |

Keep `registerExtensionRoutes.ts` skeleton for **future** extensions (cloudflare, etc.).

---

## 6. CI updates

| Workflow | Change |
| -------- | ------ |
| `.github/workflows/*` | Build `extension-prometheus` image if publish matrix exists |
| PR `/test` | kustomize verify includes extensions base |

---

## 7. Security review

Use [docs/development/security/SECURITY-REVIEW-CHECKLIST.md](docs/development/security/SECURITY-REVIEW-CHECKLIST.md):

- Metrics endpoint not public
- No PII labels
- OTLP only on loopback inside pod

---

## 8. Documentation deliverables

| Doc | Status |
| --- | ------ |
| `docs/operations/extensions/EXTENSIONS.md` | New — contract |
| `docs/operations/extensions/PROMETHEUS-METRICS-ENDPOINTS.md` | Rewrite for sidecar |
| `docs/operations/extensions/PROMETHEUS-METRIC-MIGRATION.md` | New — legacy-to-semconv mapping for dashboards/alerts |
| `.cursor/skills/extensions-env/SKILL.md` | OTEL + sidecar |
| `infra/k8s/INFRA-K8S.md` or base README | Mention extensions base |

---

## 9. Final verification commands

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run test:unit
./scripts/nix/with-env npm run test:e2e:api
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/common/
rg "prom-client" apps/api apps/management-api apps/web apps/workers packages/extension-sdk
# Expect: no prom-client in app packages; only in apps/extension-prometheus
```

---

## 10. Acceptance checklist

- [ ] All required tests green
- [ ] Staging scrape successful for api + one worker Deployment
- [ ] Rollback tested
- [ ] Legacy code removed
- [ ] Operator docs complete
- [ ] PM sign-off on v1 scope (no CronJob extensions)
