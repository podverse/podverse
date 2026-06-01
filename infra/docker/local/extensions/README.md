# Local Docker — extensions

Optional **Compose profiles** for extension sidecars. Core infra (`make local_infra_up`) does not start these services.

## Profiles

| Profile                 | Service                               | Purpose                                       |
| ----------------------- | ------------------------------------- | --------------------------------------------- |
| `extensions`            | `podverse_local_extension_prometheus` | Extension stack (v1: Prometheus sidecar only) |
| `extensions-prometheus` | Same                                  | Alias for Prometheus-focused workflows        |

## Make targets

From repo root:

```bash
make local_extensions_prometheus_up   # build image + start sidecar
make local_extensions_down            # stop extension services
make local_build_extension_prometheus # build image only
```

Requires Docker network `podverse_local_network` (created by `make local_network_create` or `make local_infra_up`).

## Env

Three templates seed local sidecar + app extension config:

| Template                                                                                               | Local file                                                                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [extensions.env.example](/infra/config/env-templates/extensions.env.example)                         | [extensions.env](/infra/config/local/extensions.env)                         |
| [extension-sidecar-otel.env.example](/infra/config/env-templates/extension-sidecar-otel.env.example) | [extension-sidecar-otel.env](/infra/config/local/extension-sidecar-otel.env) |
| [extension-prometheus.env.example](/infra/config/env-templates/extension-prometheus.env.example)     | [extension-prometheus.env](/infra/config/local/extension-prometheus.env)     |

`make local_env_setup` copies each when missing. Compose loads all three for the sidecar; apps use
`extensions.env` keys from their own env (synced via `local_env_setup` / sidecar catalog).

## OTLP and scrape (npm on host)

When apps run via **npm** on the host and the sidecar runs in Docker with published ports:

| Variable                      | Typical local value                         |
| ----------------------------- | ------------------------------------------- |
| `PROMETHEUS_ENABLED`          | `true`                                      |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://127.0.0.1:4318`                     |
| `OTEL_SERVICE_NAME`           | Per app (`podverse-api`, `podverse-web`, …) |

Scrape Prometheus at `http://127.0.0.1:9464/extensions/prometheus/metrics` (not the Next/API HTTP port).

## OTLP from other local containers

On `podverse_local_network`, use `http://podverse_local_extension_prometheus:4318` instead of `127.0.0.1`.

## Verify

```bash
curl -fsS http://127.0.0.1:9464/extensions/prometheus/health
```

Or: `./scripts/development/extensions/verify-extension-prometheus-local.sh`

Trace export (app `OTEL_TRACES_EXPORT=otlp` + sidecar `OTEL_TRACES_EXPORTER_MODE=debug` in
`infra/config/local/extension-sidecar-otel.env`):

```bash
./scripts/development/observability/verify-trace-otlp-local.sh
```

Full OTLP→scrape automation (`verify-extension-prometheus-otlp-smoke.sh`) remains optional.
