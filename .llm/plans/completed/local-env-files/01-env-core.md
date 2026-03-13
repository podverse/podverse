---
name: podverse env core plan
overview: Define and implement the core non-destructive local env pipeline (`local_env_prepare` + `local_env_setup`) with override ingestion and secret generation parity.
todos:
  - id: add-local-env-targets
    content: Add `local_env_prepare` and `local_env_setup` target graph in Makefile.local and root wiring.
    status: completed
  - id: add-local-env-scripts
    content: Create scripts for copy-if-missing, value generation, and override application.
    status: completed
  - id: add-override-examples
    content: Add dev/env-overrides/local examples and gitignore rules for non-example files.
    status: completed
  - id: fix-validate-env-paths
    content: Replace broken env/local.env copy behavior with new local env setup flow.
    status: completed
isProject: false
---

# Podverse Local Env Core Implementation Plan

## Scope

Build the make/script/env-template pipeline that creates all local runtime env files needed for:
- app development (`apps/*/.env`, `apps/*/.env.local` where applicable),
- local Docker stacks (`infra/config/local/*.env`),
- local sidecar/runtime env needs currently referenced by docs or make targets.

## Files To Modify

- [`/Users/mitcheldowney/repos/pv/podverse/Makefile.local`](/Users/mitcheldowney/repos/pv/podverse/Makefile.local)
- [`/Users/mitcheldowney/repos/pv/podverse/Makefile`](/Users/mitcheldowney/repos/pv/podverse/Makefile)
- [`/Users/mitcheldowney/repos/pv/podverse/.gitignore`](/Users/mitcheldowney/repos/pv/podverse/.gitignore)
- [`/Users/mitcheldowney/repos/pv/podverse/infra/config/env-templates/*.env.example`](/Users/mitcheldowney/repos/pv/podverse/infra/config/env-templates)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/api/.env.example`](/Users/mitcheldowney/repos/pv/podverse/apps/api/.env.example)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/workers/.env.example`](/Users/mitcheldowney/repos/pv/podverse/apps/workers/.env.example)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/management-api/.env.example`](/Users/mitcheldowney/repos/pv/podverse/apps/management-api/.env.example)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/web/.env.example`](/Users/mitcheldowney/repos/pv/podverse/apps/web/.env.example)
- [`/Users/mitcheldowney/repos/pv/podverse/apps/management-web/.env.example`](/Users/mitcheldowney/repos/pv/podverse/apps/management-web/.env.example)
- New: [`/Users/mitcheldowney/repos/pv/podverse/scripts/local-env/`](/Users/mitcheldowney/repos/pv/podverse/scripts/local-env)
- New: [`/Users/mitcheldowney/repos/pv/podverse/dev/env-overrides/local/`](/Users/mitcheldowney/repos/pv/podverse/dev/env-overrides/local)

## Target Contract

- `make local_env_prepare`
  - Creates `dev/env-overrides/local/`.
  - Copies `*.env.example` to sibling `*.env` only if missing.
  - Prints clear next-step message: update override files, then run `make local_env_setup`.

- `make local_env_setup`
  - Non-destructive for runtime env files (create missing only).
  - Creates missing local env targets from templates/examples.
  - Generates passwords/keys automatically where possible (only when target value is empty).
  - Applies manual/private values from `dev/env-overrides/local/*.env` into runtime env files.
  - Ensures shared secrets remain synchronized across all consuming env files.

## Override Model

- Keep override examples lean in format but broad in private/external coverage.
- Add committed files such as:
  - `dev/env-overrides/local/private-services.env.example`
  - `dev/env-overrides/local/podcast-index.env.example`
  - `dev/env-overrides/local/storage.env.example`
  - `dev/env-overrides/local/notifications.env.example`
- Generate missing sibling files (`*.env`) in `local_env_prepare`.
- Add `.gitignore` rule to ignore `dev/env-overrides/local/*.env` while keeping `*.env.example` tracked.

## Secret Generation Strategy

- Implement script helpers (openssl first, node fallback) similar to boilerplate pattern.
- Auto-generate at least:
  - DB credentials (`POSTGRES_PASSWORD`, read/read_write passwords)
  - MQ credential password fields
  - KeyValDB password
  - JWT/auth secrets
  - Add-by-RSS encryption key (hex-32 bytes)
  - WebPush VAPID keys if unset
- Keep generation idempotent and format-compliant (`"value"` for non-empty, empty unquoted when unset).

## Runtime File Mapping

- Ensure generated values are routed to both:
  - Docker env files in `infra/config/local/*.env`
  - Host-run app env files in `apps/*/.env` and `apps/*/.env.local`
- Normalize host defaults (localhost and mapped ports) for host-run apps where needed, while preserving container-hostnames for Docker-only env files.

## Backward Compatibility

- Keep existing `local_setup` and `local_infra_up` usable.
- Wire `local_setup` to depend on `local_env_setup` so first-run is resilient.
- Replace/repair current `validate` assumptions that reference nonexistent `apps/*/env/local.env` files.

## Verification Plan

- Dry-run target calls in order:
  1. `make local_env_prepare`
  2. `make local_env_setup`
  3. `make local_setup`
- Verify resulting files exist and values are populated as expected.
- Verify re-running setup does not overwrite existing non-empty values.
