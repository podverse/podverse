# Plan 13 — Tests and verification (final gate)

## Objective

Final verification across integrations, extension-metrics rename, and observability.

Depends on: all prior plans (01–12).

---

## 1. Unit tests

| Package / app | Tests |
| ------------- | ----- |
| `@podverse/integrations-web` | Builder, nested `cloudflare.webAnalytics` |
| `@podverse/extension-metrics-sdk` | Init, HTTP/worker metrics, renamed env |
| `@podverse/observability` | Init, propagation, middleware |
| `apps/web` / management-web | `runtime-config-store` preserves `integrations` |
| `packages/helpers-backend` | Logger trace_id format; fetchWithTimeout propagation |
| `apps/management-api` | `getAuditRequestId` |

```bash
./scripts/nix/with-env npm run test:unit
./scripts/nix/with-env npm run test -w @podverse/integrations-web
./scripts/nix/with-env npm run test -w @podverse/extension-metrics-sdk
./scripts/nix/with-env npm run test -w @podverse/observability
```

---

## 2. API integration tests

```bash
./scripts/nix/with-env npm run test:e2e:api
```

Include observability middleware / trace header tests where added in plans 09–10.

---

## 3. E2E — Cloudflare integrations

New specs:

- [`apps/web/e2e/cloudflare-web-analytics-integration.spec.ts`](../../../apps/web/e2e/cloudflare-web-analytics-integration.spec.ts)
- management-web mirror

Update [`apps/web/playwright.e2e-server-env.ts`](../../../apps/web/playwright.e2e-server-env.ts):

- `CLOUDFLARE_WEB_ANALYTICS_*` for **enabled** spec only
- Default E2E: integration disabled

User runs:

```bash
make e2e_test_web_report_spec SPEC=e2e/cloudflare-web-analytics-integration.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/cloudflare-web-analytics-integration.spec.ts
```

---

## 4. Rollout doc updates and local Docker gate

Update [`docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md`](../../../docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md):

- Remove k.podcastdj.com / prometheus.podcastdj.com-specific steps
- Use `PROMETHEUS_*`, `OTEL_*` (no `EXT_*`); reference `@podverse/extension-metrics-sdk`
- Generic GitOps enablement: uncomment alpha sidecar components, set env, sync, verify scrape

**Local Docker gate:**

```bash
make local_extensions_prometheus_up
./scripts/development/extensions/verify-extension-prometheus-local.sh
```

---

## 5. Lint and build (final gate)

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
./scripts/nix/with-env npm run build -w apps/api
```

---

## 6. Plan set cleanup

- [ ] All numbered plans 01–13 marked complete in COPY-PASTA
- [ ] Move plan set to `.llm/plans/completed/integrations-web-extension-taxonomy/` per plan-completion skill
- [ ] Confirm `.llm/plans/active/distributed-tracing/` deleted (merged into 08–12)

---

## Out of scope

- Full `make e2e_test_report` unless requested
- Production Cloudflare enablement
- External GitOps repos, Argo sync, cluster deploy
