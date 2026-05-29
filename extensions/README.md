# Extensions (optional sidecars)

Deployable **extension sidecar** workspaces. Each subdirectory is one optional capability operators enable via GitOps (Kustomize components) and env toggles (e.g. `PROMETHEUS_ENABLED`).

| Path          | npm package                      | GHCR image                                       |
| ------------- | -------------------------------- | ------------------------------------------------ |
| `prometheus/` | `@podverse/extension-prometheus` | `ghcr.io/podverse/podverse/extension-prometheus` |

**Client library:** apps use [`packages/extension-metrics-sdk`](../packages/extension-metrics-sdk/) for OTLP **metrics** export to sidecars in the same pod. Main app images do not bundle sidecar-specific deps.

**K8s:** shared ConfigMap and sidecar components live under [`infra/k8s/base/common/`](../infra/k8s/base/common/) (not in this folder).

**Local Docker:** [`infra/docker/local/extensions/`](../infra/docker/local/extensions/) — Compose profiles and Dockerfiles per extension id.

**Dev scripts:** [`scripts/development/extensions/`](../scripts/development/extensions/) — contract checks and local sidecar smoke.

**Docs:** [docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md](../docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md)

## Adding a new extension

1. Add `extensions/<id>/` with its own `package.json` and image build.
2. Add K8s component under `infra/k8s/base/common/components/<id>-sidecar/`.
3. Add app toggle env keys to `infra/k8s/base/common/source/extensions/extensions.env`; sidecar keys to
   `extension-<id>.env` (and shared OTLP collector keys to `extension-sidecar-otel.env` when using otelcol).
4. Publish image as `ghcr.io/podverse/podverse/extension-<id>` (separate from other extensions).
