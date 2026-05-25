# Plan 02 — Remove `EXT_*` prefix + rename extension-metrics-sdk

## Objective

1. Rename extension env vars to section-scoped names (**Extensions** subsection, no `EXT_` prefix).
2. Rename [`packages/extension-sdk/`](../../../packages/extension-sdk/) → [`packages/extension-metrics-sdk/`](../../../packages/extension-metrics-sdk/) (`@podverse/extension-metrics-sdk`).

**Do not** change unrelated env keys (e.g. `NEXT_PUBLIC_CONTACT_EMAIL`).

Depends on: [01-docs-skills-and-taxonomy.md](./01-docs-skills-and-taxonomy.md) (docs reference new package name).

---

## 1. Env rename map

| Old | New | Subsection |
| --- | --- | ---------- |
| `EXT_PROMETHEUS_ENABLED` | `PROMETHEUS_ENABLED` | Extensions |
| `EXT_PROMETHEUS_METRICS_PORT` | `PROMETHEUS_METRICS_PORT` | Extensions |
| `EXT_PROMETHEUS_METRICS_PATH` | `PROMETHEUS_METRICS_PATH` | Extensions |
| `EXT_PROMETHEUS_COLLECT_PROCESS_METRICS` | `PROMETHEUS_COLLECT_PROCESS_METRICS` | Extensions |
| `EXT_OTEL_EXPORTER_OTLP_ENDPOINT` | `OTEL_EXPORTER_OTLP_ENDPOINT` | Observability when `OTEL_TRACES_EXPORT=otlp`; also read by Extensions metrics (single var, listed once in Observability section per plan 08) |
| `EXT_OTEL_SERVICE_NAME` | `OTEL_SERVICE_NAME` | Observability (first); shared with `config.extensions.otel` when metrics enabled |
| `EXT_OTEL_RESOURCE_ATTRIBUTES` | `OTEL_RESOURCE_ATTRIBUTES` | Extensions |
| `EXT_OTEL_RECEIVER_OTLP_HTTP_PORT` | `OTEL_RECEIVER_OTLP_HTTP_PORT` | Extensions (sidecar) |

**Note:** `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT` live in the **Observability** subsection (plan 08). `config.extensions.otel.serviceName` and `config.observability.serviceName` both read `OTEL_SERVICE_NAME`; metrics and trace export share `OTEL_EXPORTER_OTLP_ENDPOINT` when both enabled.

Sidecar-only trace forward keys in plan 11 use `OTEL_TRACES_EXPORTER_*` (no `EXT_` prefix).

---

## 2. Package rename: extension-sdk → extension-metrics-sdk

| Step | Action |
| ---- | ------ |
| Move | `git mv packages/extension-sdk packages/extension-metrics-sdk` |
| package.json | `"name": "@podverse/extension-metrics-sdk"` |
| Description | OTEL metrics client for extension sidecars (not a general extension umbrella) |
| Config type | Rename `ExtensionInitConfig.prometheusEnabled` → `metricsExtensionEnabled` (optional but recommended) |
| Root package.json | Update `build:packages` workspace list |
| Importers | `apps/api`, `apps/management-api`, `apps/web`, `apps/management-web`, `apps/workers` package.json + bootstrap files |
| Dockerfiles | api, management-api, web, workers per docker-runtime-workspace-parity skill |
| Docs/skills | `extensions/README.md`, `.cursor/skills/extensions-env/SKILL.md`, `EXTENSIONS-SIDECAR.md` |
| lockfile | Run `make sync_lockfile` or `npm install` at root |

Ripgrep for stale imports:

```bash
rg '@podverse/extension-sdk|packages/extension-sdk' --glob '!package-lock.json'
```

---

## 3. Code touch list (env + package)

| Area | Files |
| ---- | ----- |
| Apps config | `apps/*/src/config/index.ts`, bootstrap `*Extensions*.ts` |
| Validation | `apps/*/src/lib/startup/validation.ts` |
| Metrics SDK | `packages/extension-metrics-sdk/**` |
| Sidecar extension | `extensions/prometheus/src/config.ts`, tests, `.env.example` |
| K8s / Docker / templates | `infra/k8s/base/extensions/**`, `infra/docker/local/extensions/**`, `infra/config/env-templates/extensions.env.example` |
| Tests | workers extension tests, metrics-sdk tests |
| Docs | [`docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md`](../../../docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md) — `PROMETHEUS_*`, `OTEL_*` (no `EXT_*`); remove external-repo-specific steps |

---

## 4. Validation categories

- **Extensions / OpenTelemetry** — metrics OTLP vars
- **Extensions / Prometheus** — `PROMETHEUS_*`

Observability categories added in plan 08 **before** Extensions.

---

## 5. Config mapping

```typescript
extensions: {
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED === 'true',
  },
  otel: {
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
    serviceName: process.env.OTEL_SERVICE_NAME!, // shared with observability (plan 08)
  },
},
```

Bootstrap:

```typescript
import { initExtensions } from '@podverse/extension-metrics-sdk';
```

---

## 6. Verification

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/api
./scripts/nix/with-env npm run test -w @podverse/extension-metrics-sdk
./scripts/nix/with-env npm run test -w @podverse/extension-prometheus
rg 'EXT_PROMETHEUS|EXT_OTEL_|@podverse/extension-sdk' --glob '!package-lock.json' --glob '!.llm/history/**'
```

---

## Out of scope

- `@podverse/observability` (plan 08)
- Cloudflare / integrations env (plans 03–06)
