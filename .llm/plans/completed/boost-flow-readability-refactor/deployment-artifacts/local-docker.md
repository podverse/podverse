# Deployment Artifact - local Docker only

Date: 2026-04-16

## Executed Commands

```bash
make local_env_setup
make local_build_web_runtime_config
make local_build_web
make local_infra_up
make local_test_web
docker compose -f infra/docker/local/web/docker-compose.yml logs podverse_local_web_runtime_config --tail=200
docker exec podverse_local_web node -e "const url=(process.env.RUNTIME_CONFIG_URL||'') + '/runtime-config'; fetch(url).then(async r=>{console.log('status='+r.status); console.log(await r.text());}).catch(e=>{console.error(e); process.exit(1);});"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | rg "podverse_local_web|podverse_local_web_runtime_config"
```

## Results

- Build and startup commands: pass
- `podverse_local_web_runtime_config` and `podverse_local_web` containers started successfully
- Sidecar logs show startup validation success (`Failed: 0`, `Required Missing: 0`)
- Runtime-config fetch from web container to sidecar URL: `status=200`

## Runtime-Config Payload Excerpt (MetaBoost keys)

Observed runtime payload did not include:

- `NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD`
- `NEXT_PUBLIC_APP_VALUE_METABOOST_NODE`

Sidecar logs confirm these optional values were skipped (unset) in Docker env.

## Health Evidence

Container status snapshot:

- `podverse_local_web_runtime_config   Up`
- `podverse_local_web                  Up`

## MB1-Capable Initialization Scenario

- Web + sidecar initialize correctly in Docker path.
- MB1-specific runtime keys are currently unset, so MB1-capable runtime payload was not validated as configured-on in this run.

## Status

- Docker path is operational and validation-clean.
- Follow-up needed to set MetaBoost env values in Docker sidecar env and confirm they appear in `/runtime-config`.
