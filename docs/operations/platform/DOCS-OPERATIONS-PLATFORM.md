# Platform capabilities

Podverse groups cross-cutting platform behavior into **three pillars**. Each pillar has its own
package(s), env subsection order, and Kubernetes wiring rules.

## Three pillars

| Pillar            | Sidecar? | Package / client                                  | ConfigMap                      | Config path              | Detail doc                                                   |
| ----------------- | -------- | ------------------------------------------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------ |
| **Observability** | No       | `@podverse/observability`                         | Per-app source env             | `config.observability.*` | [TRACING.md](/docs/operations/observability/TRACING.md)                    |
| **Integration**   | No       | `@podverse/integrations-web`                      | `podverse-integrations-config` | `config.integrations.*`  | [INTEGRATIONS-WEB.md](/docs/operations/integrations/INTEGRATIONS-WEB.md)   |
| **Extension**     | Yes      | `@podverse/extension-metrics-sdk` + sidecar image | `podverse-extensions-config`   | `config.extensions.*`    | [EXTENSIONS-SIDECAR.md](/docs/operations/extensions/EXTENSIONS-SIDECAR.md) |

## Pillar definitions

**Observability** — Always-on in-process tracing: W3C trace context, spans, and `trace_id` /
`span_id` in logs. Optional OTLP trace export uses `config.observability.*` and may share the
extension sidecar OTLP receiver on port `4318`.

**Integration** — Optional vendor capabilities shipped in the default application image (no
extension sidecar). Runtime-config sidecars project integration settings into `/runtime-config`
JSON for web and management-web.

**Extension** — Optional sidecar containers plus app-side OTEL metrics clients when
`PROMETHEUS_ENABLED` is true. Prometheus scrapes the sidecar on port `9464`, not the main app HTTP
port.

## Package boundaries

| Package                           | Purpose                                                                  | Gated?            |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------- |
| `@podverse/observability`         | W3C trace context, spans, log `trace_id`, optional OTLP **trace** export | Context always on |
| `@podverse/extension-metrics-sdk` | OTEL **metrics** to sidecar when `PROMETHEUS_ENABLED`                    | Yes               |
| `@podverse/integrations-web`      | Built-in web head scripts / runtime-config projection                    | Per integration   |
| `extensions/prometheus/`          | Sidecar server (OTLP receiver, Prometheus scrape, traces forward)        | Sidecar optional  |

Tracing lives in `@podverse/observability`. Metrics export lives in `@podverse/extension-metrics-sdk`.

## Env section order

API and workers use three subsections in each app `.env.example` (Observability → Integrations → Extensions).

Web and management-web local catalog: [apps/web/sidecar/.env.example](/apps/web/sidecar/.env.example)
(and management-web mirror). That file lists all keys; `make local_env_setup` copies **Integrations**
and `NEXT_PUBLIC_*` to the runtime-config sidecar env and **Observability** + **Extensions** to
`.env.local` and `infra/config/local/web.env` for the Next.js main process. App
`.env.example` files contain only `RUNTIME_CONFIG_URL`.

Kubernetes splits the same keys across `podverse-web-config`, `podverse-web-runtime-config`,
`podverse-integrations-config`, and `podverse-extensions-config` (not one file).

## Quick reference

| Topic                                           | Doc                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Tracing, `OTEL_TRACES_*`, log correlation       | [TRACING.md](/docs/operations/observability/TRACING.md)                                        |
| Cloudflare Web Analytics, `CLOUDFLARE_*`        | [INTEGRATIONS-WEB.md](/docs/operations/integrations/INTEGRATIONS-WEB.md)                       |
| Prometheus sidecar, metrics SDK, `PROMETHEUS_*` | [EXTENSIONS-SIDECAR.md](/docs/operations/extensions/EXTENSIONS-SIDECAR.md)                     |
| Scrape paths and Prometheus jobs                | [PROMETHEUS-METRICS-ENDPOINTS.md](/docs/operations/extensions/PROMETHEUS-METRICS-ENDPOINTS.md) |

## Local development

```bash
make local_extensions_prometheus_up
./scripts/development/extensions/verify-extension-prometheus-local.sh
./scripts/development/observability/verify-trace-otlp-local.sh
```

See [EXTENSIONS-SIDECAR.md](/docs/operations/extensions/EXTENSIONS-SIDECAR.md) for extension sidecar setup and
[TRACING.md](/docs/operations/observability/TRACING.md) for trace export.

## Cursor guidance

- `.cursor/skills/observability/SKILL.md` — Observability env and config
- `.cursor/skills/integrations-web/SKILL.md` — Integrations package
- `.cursor/skills/extensions-env/SKILL.md` — Extensions env and cross-pillar layout
