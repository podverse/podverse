# Plan 08 — Local Docker Compose extension profiles

## Objective

Enable **one-command local testing** of extensions (Prometheus sidecar + OTLP) without baking extension deps into default app images, using Compose **profiles** separate from core local stack.

---

## 1. Directory layout

```
infra/docker/local/extensions/
  README.md
  docker-compose.yml          # profile definitions
  prometheus/
    Dockerfile
    .env.example
  env/
    extensions.env.example    # copied to infra/config/local/extensions.env
```

Keep extension Docker **separate** from [infra/docker/local/api/docker-compose.yml](infra/docker/local/api/docker-compose.yml) core services but on same `podverse_local_network` external network.

---

## 2. Compose profiles

```yaml
# infra/docker/local/extensions/docker-compose.yml
services:
  podverse_local_extension_prometheus:
    profiles: ["extensions", "extensions-prometheus"]
    build:
      context: ../../..
      dockerfile: infra/docker/local/extensions/prometheus/Dockerfile
    ports:
      - "127.0.0.1:9464:9464"
      - "127.0.0.1:4318:4318"
    env_file:
      - ../../../config/local/extensions.env
    networks:
      - podverse_local_network

networks:
  podverse_local_network:
    external: true
```

### Wiring apps to sidecar (local dev without K8s)

When running apps via **npm** (not full pod):

| App | `EXT_OTEL_EXPORTER_OTLP_ENDPOINT` |
| --- | --------------------------------- |
| api | `http://127.0.0.1:4318` |
| workers | `http://127.0.0.1:4318` |
| web (Next) | `http://127.0.0.1:4318` |

Document that full **pod simulation** (localhost between containers) uses compose **links** or host networking; for npm-on-host + extension container, `127.0.0.1` works.

### Optional: api + sidecar profile bundle

```yaml
  podverse_local_api_with_extensions:
    profiles: ["extensions-prometheus"]
    extends: ... # or duplicate api service with env overrides
```

Prefer documenting two-step flow for v1:

```bash
make local_infra_up
docker compose -f infra/docker/local/extensions/docker-compose.yml --profile extensions-prometheus up -d
EXT_PROMETHEUS_ENABLED=true EXT_OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 npm run dev:api
```

---

## 3. Make targets

Add to `makefiles/local/Makefile.local.extensions.mk` (included from root Makefile):

| Target | Action |
| ------ | ------ |
| `local_extensions_up` | Compose profile `extensions` up |
| `local_extensions_prometheus_up` | Profile `extensions-prometheus` |
| `local_extensions_down` | Tear down extension services |
| `local_build_extension_prometheus` | Build image |

Document in [docs/QUICKSTART.md](docs/QUICKSTART.md) under Observability / Extensions section.

---

## 4. Env setup integration

| File | Purpose |
| ---- | ------- |
| `infra/config/env-templates/extensions.env.example` | Template |
| `scripts/local-env/setup.sh` | Copy to `infra/config/local/extensions.env` if missing |
| `apps/api/.env.example` | Reference extensions template |

### `extensions.env.example`

```bash
EXT_PROMETHEUS_ENABLED="false"
EXT_OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
EXT_PROMETHEUS_METRICS_PORT="9464"
```

Per-app `.env` sets `EXT_OTEL_SERVICE_NAME` when enabling locally.

---

## 5. Local verification script (optional)

`scripts/development/extensions/verify-extension-prometheus-local.sh`:

1. Curl `http://127.0.0.1:9464/extensions/prometheus/health`
2. Curl metrics path
3. Exit non-zero if extension profile not running

---

## 6. Separation from runtime-config sidecars

| Service | Profile | Contains prom-client? |
| ------- | ------- | --------------------- |
| `web-runtime-config` | core web compose | No |
| `extension-prometheus` | extensions-prometheus | Yes |

Never add `prom-client` to [apps/web/sidecar/package.json](apps/web/sidecar/package.json).

---

## 7. Developer workflow doc

Add section to `docs/operations/extensions/EXTENSIONS.md`:

1. Start infra
2. `make local_extensions_prometheus_up`
3. Enable env vars in app `.env`
4. Start app
5. Generate traffic
6. Scrape `localhost:9464`

---

## 8. Verification

```bash
make local_infra_up
make local_extensions_prometheus_up
curl -fsS http://127.0.0.1:9464/extensions/prometheus/health
curl -fsS http://127.0.0.1:9464/extensions/prometheus/metrics | head -5
```

---

## 9. Acceptance checklist

- [ ] Profiles `extensions` and `extensions-prometheus` documented
- [ ] Extension compose does not break default `local_infra_up`
- [ ] Env template wired into local_env_setup
- [ ] QUICKSTART updated
- [ ] npm dev workflow tested for api at minimum
