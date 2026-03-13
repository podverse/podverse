---
name: podverse local env master
overview: Implement a boilerplate-style local env workflow in Podverse using `local_env_prepare` and `local_env_setup`, with override-driven private values and local-only pgAdmin support.
todos:
  - id: phase-1-env-core
    content: Add local_env_prepare/local_env_setup workflow with override scaffolding and secret generation.
    status: completed
  - id: phase-2-pgadmin
    content: Add local-only pgAdmin compose and make targets integrated with local infra targets.
    status: completed
  - id: phase-3-docs
    content: Update Quick Start and README to document prepare/setup and override workflow.
    status: completed
isProject: false
---

# Podverse Local Env Process - Master Plan

## Goal

Create a local-only env workflow for the Podverse monorepo that:
- prepares override files in `dev/env-overrides/local/`,
- generates/copies local runtime env files with `local_` prefixed Make targets,
- auto-generates passwords/keys where possible,
- consumes override-provided values for non-generatable/private values,
- adds a local-only pgAdmin service with preconfigured DB access.

## Confirmed Decisions

- `local_env_setup` is **non-destructive**: create missing files only, preserve existing files.
- `dev/env-overrides/local/*.env.example` includes **all private/external variables** (required + optional).

## Current-State Anchors

- Local orchestration and infra lifecycle: [`/Users/mitcheldowney/repos/pv/podverse/Makefile.local`](/Users/mitcheldowney/repos/pv/podverse/Makefile.local)
- Root make entrypoints and current validate behavior: [`/Users/mitcheldowney/repos/pv/podverse/Makefile`](/Users/mitcheldowney/repos/pv/podverse/Makefile)
- Existing infra/env templates: [`/Users/mitcheldowney/repos/pv/podverse/infra/config/env-templates`](/Users/mitcheldowney/repos/pv/podverse/infra/config/env-templates)
- Existing local DB compose: [`/Users/mitcheldowney/repos/pv/podverse/infra/docker/local/db/docker-compose.yml`](/Users/mitcheldowney/repos/pv/podverse/infra/docker/local/db/docker-compose.yml)
- Reference pattern (boilerplate env + pgAdmin): [`/Users/mitcheldowney/repos/pv/boilerplate/makefiles/local/Makefile.local.env.mk`](/Users/mitcheldowney/repos/pv/boilerplate/makefiles/local/Makefile.local.env.mk), [`/Users/mitcheldowney/repos/pv/boilerplate/scripts/env-setup-secrets.sh`](/Users/mitcheldowney/repos/pv/boilerplate/scripts/env-setup-secrets.sh), [`/Users/mitcheldowney/repos/pv/boilerplate/infra/docker/local/docker-compose.yml`](/Users/mitcheldowney/repos/pv/boilerplate/infra/docker/local/docker-compose.yml)

## Planned Deliverables

- New local env targets:
  - `local_env_prepare`
  - `local_env_setup`
- New scripts for:
  - override scaffold/copy,
  - secret generation and env assignment,
  - optional env cleanup helper for full reset flows.
- New tracked override examples under `dev/env-overrides/local/` and gitignored concrete override files.
- Local pgAdmin service and make target(s), only for local flow.
- Updated docs (`README` and Quick Start) that reflect the two-step prepare/setup process.

## Execution Sequence

1. Implement env workflow core (target wiring + scripts + override directory contract).
2. Add pgAdmin local service and make target integration.
3. Update docs and verify command ergonomics.

## Risks To Handle

- Avoid breaking existing `local_setup` and `local_infra_up` flows.
- Keep host-mode app `.env` defaults compatible with local Docker port mappings.
- Ensure generated values stay consistent across files that share credentials.
- Keep private override files out of git while committing `.example` files.
