---
name: podverse pgadmin docs plan
overview: Add local-only pgAdmin integration and update docs to make the two-step env flow discoverable and easy to follow.
todos:
  - id: add-pgadmin-compose
    content: Add pgAdmin service and server profile in local docker config.
    status: completed
  - id: wire-pgadmin-targets
    content: Create make targets and lifecycle wiring for pgAdmin local up/down/clean.
    status: completed
  - id: update-quickstart
    content: Document local_env_prepare/local_env_setup flow and pgAdmin usage.
    status: completed
  - id: update-readme
    content: Align root README env and local command docs with new process.
    status: completed
isProject: false
---

# Podverse Local pgAdmin + Docs Plan

## Scope

Add a local-only pgAdmin service that boots with local Docker infra and is preconfigured for easy DB
inspection. Then update docs to explain the new two-step env flow and pgAdmin usage.

## Files To Modify

- [`/Users/mitcheldowney/repos/pv/podverse/infra/docker/local/db/docker-compose.yml`](/Users/mitcheldowney/repos/pv/podverse/infra/docker/local/db/docker-compose.yml) or new sibling compose file under [`/Users/mitcheldowney/repos/pv/podverse/infra/docker/local/`](/Users/mitcheldowney/repos/pv/podverse/infra/docker/local)
- New (if needed): [`/Users/mitcheldowney/repos/pv/podverse/infra/docker/local/pgadmin/servers.json`](/Users/mitcheldowney/repos/pv/podverse/infra/docker/local/pgadmin/servers.json)
- [`/Users/mitcheldowney/repos/pv/podverse/Makefile.local`](/Users/mitcheldowney/repos/pv/podverse/Makefile.local)
- [`/Users/mitcheldowney/repos/pv/podverse/docs/QUICKSTART.md`](/Users/mitcheldowney/repos/pv/podverse/docs/QUICKSTART.md)
- [`/Users/mitcheldowney/repos/pv/podverse/README.md`](/Users/mitcheldowney/repos/pv/podverse/README.md)

## pgAdmin Design

- Local-only service name (e.g., `podverse_local_pgadmin`).
- Expose host port for browser access (for example `http://localhost:5051`).
- Configure pgAdmin non-server mode for easy startup.
- Mount `servers.json` to pre-register main local Postgres server.
- Inject DB password through `PGPASSFILE` at container startup so DB table browsing works immediately.
- Ensure dependency on local DB service health/start.

## Make Target Integration

- Add explicit targets:
  - `local_pgadmin_up`
  - `local_pgadmin_down`
- Include pgAdmin in `local_infra_up` so it starts in local infra workflows.
- Include pgAdmin down/cleanup in `local_all_down` and `local_clean`.

## Documentation Updates

- In Quick Start:
  - Introduce `local_env_prepare` then `local_env_setup` before infra startup.
  - Explain override editing requirement between those steps.
  - Add pgAdmin URL and expected login behavior.
- In root README:
  - Replace outdated references to `apps/*/env/local.env` with current generated file locations.
  - Add short local env lifecycle commands (prepare/setup/infra up/down/reset).

## Acceptance Criteria

- `make local_infra_up` starts DB + pgAdmin locally.
- Opening pgAdmin in browser can immediately connect to local Postgres with predefined server profile.
- Docs match actual make targets and file paths, with no stale `apps/*/env/local.env` references.
