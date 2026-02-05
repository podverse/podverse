---
name: lighthouse-docker-sync
description: Keeps Lighthouse Docker compose/env files aligned with infra Docker changes. Use when editing infra docker-compose files, docker envs, or scripts that Lighthouse services depend on.
---

# Lighthouse Docker Sync

## Purpose

Lighthouse owns its own Docker services under `tools/web-perf/lighthouse/docker`.
When infra Docker definitions or scripts change, ensure the Lighthouse copies stay aligned.

## Update Checklist

- Update `tools/web-perf/lighthouse/docker/docker-compose.yml` when DB/MQ/KeyvalDB
  images, commands, volumes, or ports change in infra.
- Update `tools/web-perf/lighthouse/docker/env/*.env` when infra env files change.
- Keep lighthouse-specific container names and ports to avoid collisions with local dev services.
- If infra DB init/seed scripts change, ensure the Lighthouse reset flow still runs
  the correct script and mounts the right paths.

## Related Paths

- `tools/web-perf/lighthouse/docker/docker-compose.yml`
- `tools/web-perf/lighthouse/docker/env/db.env`
- `tools/web-perf/lighthouse/docker/env/mq.env`
- `tools/web-perf/lighthouse/docker/env/keyvaldb.env`
