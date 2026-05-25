# Plan 04 — K8s shared extension config and wiring

## Objective

Centralize extension toggles in **one ConfigMap** (like product-membership) and add **extension-prometheus sidecar** to eligible Deployments via Kustomize **components/overlays**.

---

## 1. New K8s base: `infra/k8s/base/extensions/`

```
infra/k8s/base/extensions/
  kustomization.yaml
  source/extensions.env
```

### `source/extensions.env`

```env
# Extensions (forward-looking)
# EXT_PROMETHEUS_ENABLED: when true, workloads mount extension-prometheus sidecar and apps export OTLP
EXT_PROMETHEUS_ENABLED=false
EXT_OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
EXT_PROMETHEUS_METRICS_PORT=9464
EXT_PROMETHEUS_METRICS_PATH=/extensions/prometheus/metrics
```

Per-app `EXT_OTEL_SERVICE_NAME` stays in **app-specific** ConfigMaps (differs per Deployment).

### `kustomization.yaml`

```yaml
configMapGenerator:
  - name: podverse-extensions-config
    envs:
      - source/extensions.env
generatorOptions:
  disableNameSuffixHash: true
```

---

## 2. Alpha common composition

Update [infra/k8s/alpha/common/kustomization.yaml](infra/k8s/alpha/common/kustomization.yaml):

```yaml
resources:
  - ...
  - https://github.com/podverse/podverse//infra/k8s/base/extensions?ref=X.Y.Z-staging.N
```

Shared toggle file for cluster config values: merge overlay on `extensions.env` in alpha if needed.

---

## 3. Sidecar injection pattern

Create reusable Kustomize resource:

```
infra/k8s/base/extensions/components/prometheus-sidecar/
  kustomization.yaml
  prometheus-sidecar.yaml   # strategic merge patch or Component
```

### Patch behavior

When `EXT_PROMETHEUS_ENABLED=true` is not enough alone for optional sidecar, use:

**Option A (recommended):** Kustomize **Component** included only in overlays that enable extensions (e.g. `alpha/extensions-on/`).  
**Option B:** Always define sidecar container; entrypoint exits immediately if disabled (wastes resources — avoid).

**Option A detail:**

- Default base Deployments: **no** sidecar
- Overlay `infra/k8s/alpha/api-extensions/` (or patch in alpha api kustomization when `extensions.env` merged to true): adds container + `envFrom` extensions ConfigMap

Enablement model is **component-based**: set `EXT_PROMETHEUS_ENABLED=true` in shared `extensions.env` **and** apply the extensions component/overlay per app Argo application.

### Sidecar container spec (template)

```yaml
- name: extension-prometheus
  image: ghcr.io/podverse/podverse/extension-prometheus
  ports:
    - containerPort: 9464
      name: metrics
    - containerPort: 4318
      name: otlp
  envFrom:
    - configMapRef:
        name: podverse-extensions-config
  resources:
    requests:
      memory: 64Mi
      cpu: 50m
    limits:
      memory: 128Mi
      cpu: 200m
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    readOnlyRootFilesystem: true
```

---

## 4. Per-workload `envFrom` updates

Add to **main container** `envFrom`:

```yaml
- configMapRef:
    name: podverse-extensions-config
```

| Deployment file | Main container |
| --------------- | -------------- |
| [infra/k8s/base/api/deployment.yaml](infra/k8s/base/api/deployment.yaml) | `api` |
| [infra/k8s/base/management-api/deployment.yaml](infra/k8s/base/management-api/deployment.yaml) | `management-api` |
| [infra/k8s/base/web/deployment.yaml](infra/k8s/base/web/deployment.yaml) | `web` |
| [infra/k8s/base/management-web/deployment.yaml](infra/k8s/base/management-web/deployment.yaml) | `management-web` |
| All 8 under [infra/k8s/base/workers/](infra/k8s/base/workers/) | `worker` |

### Remove duplicates

Remove `EXT_PROMETHEUS_ENABLED` from:

- [infra/k8s/base/api/source/api.env](infra/k8s/base/api/source/api.env)
- [infra/k8s/base/management-api/source/management-api.env](infra/k8s/base/management-api/source/management-api.env)

Replace with comment: `# EXT_PROMETHEUS_* : see podverse-extensions-config`.

---

## 5. App-specific OTEL service names

Add to each app ConfigMap source (not shared extensions file):

| ConfigMap | Example |
| --------- | ------- |
| `api.env` | `EXT_OTEL_SERVICE_NAME=podverse-api` |
| `management-api.env` | `EXT_OTEL_SERVICE_NAME=podverse-management-api` |
| `web.env` / sidecar | `EXT_OTEL_SERVICE_NAME=podverse-web` |
| `workers.env` | `EXT_OTEL_SERVICE_NAME=podverse-worker` (override per Deployment patch if needed) |

---

## 6. Worker-specific: scrape without Service

Add pod template annotations (patch all worker Deployments):

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9464"
    prometheus.io/path: "/extensions/prometheus/metrics"
```

Document Prometheus `kubernetes_sd_configs` role pod + label selector `app` in `PROMETHEUS-METRICS-ENDPOINTS.md`.

---

## 7. Web pod: two containers + extension

Do **not** merge extension into `runtime-config` container.

Final pod:

| Container | Port | Role |
| --------- | ---- | ---- |
| web / management-web | 3002 / 3102 | Next + OTEL |
| runtime-config | 3001 / 3101 | Config only |
| extension-prometheus | 9464, 4318 | Scrape + OTLP |

---

## 8. Images in alpha kustomizations

Add to each overlay `images:` section:

```yaml
- name: ghcr.io/podverse/podverse/extension-prometheus
  newTag: X.Y.Z-staging.N
```

Files: `alpha/api/kustomization.yaml`, `alpha/web/kustomization.yaml`, `alpha/workers/...`, etc.

---

## 9. Verification

```bash
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/common/
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/api/
# Inspect: podverse-extensions-config present; extension container when component enabled
```

---

## 10. Acceptance checklist

- [ ] `podverse-extensions-config` generated from single `extensions.env`
- [ ] alpha/common includes extensions base
- [ ] All eligible Deployments reference shared ConfigMap
- [ ] Sidecar optional via documented overlay/component
- [ ] Enablement runbook explicitly documents two required K8s actions (shared toggle + component/overlay)
- [ ] Duplicate EXT_PROMETHEUS removed from api/management-api source env
- [ ] Argo CD push reminder in PR (argocd-gitops-push skill)
