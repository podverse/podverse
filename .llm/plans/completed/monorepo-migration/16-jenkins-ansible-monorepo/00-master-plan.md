# Jenkins + Ansible Monorepo Migration (Split Plan)

## Overview

Migrate Jenkins jobs and podverse-ansible roles from the legacy `podverse-ops` repo structure to the `podverse` monorepo layout, and introduce sparse checkouts to minimize server footprint.

## Goals

- Jenkins jobs reference monorepo paths under `/opt/podverse`.
- Jenkins job definitions use sparse checkout to pull only `infra/`, `pipelines/jenkins/`, `scripts/`, and Makefiles.
- podverse-ansible clones `podverse` (not `podverse-ops`) and places config under the monorepo `infra/config/` hierarchy.
- Documentation reflects the new repo and paths.
- Alpha-only scope: do not change legacy production or sandbox deployment behavior.
- If new files are required to avoid overlap with legacy/sandbox, include them explicitly.

## Sub-Plans

- [01-jenkins-import-and-sparse-checkout.md](/Users/mitcheldowney/repos/podverse/.llm/plans/active/monorepo-migration/16-jenkins-ansible-monorepo/01-jenkins-import-and-sparse-checkout.md)
- [02-jenkins-pipeline-path-updates.md](/Users/mitcheldowney/repos/podverse/.llm/plans/active/monorepo-migration/16-jenkins-ansible-monorepo/02-jenkins-pipeline-path-updates.md)
- [03-ansible-monorepo-path-updates.md](/Users/mitcheldowney/repos/podverse/.llm/plans/active/monorepo-migration/16-jenkins-ansible-monorepo/03-ansible-monorepo-path-updates.md)
- [04-docs-validation-and-cleanup.md](/Users/mitcheldowney/repos/podverse/.llm/plans/active/monorepo-migration/16-jenkins-ansible-monorepo/04-docs-validation-and-cleanup.md)

## Key Path Changes to Apply Everywhere

- Replace `/opt/podverse-ops` with `/opt/podverse`.
- Docker compose paths:
  - Legacy: `/opt/podverse-ops/docker-compose/alpha/...`
  - Monorepo: `/opt/podverse/infra/docker/alpha/...`
- Config/env file paths:
  - Legacy: `/opt/podverse-ops/config/...`
  - Monorepo: `/opt/podverse/infra/config/alpha/...` (alpha only)
- Script paths:
  - Legacy: `/opt/podverse-ops/scripts/...`
  - Monorepo: `/opt/podverse/scripts/...`
- Jenkinsfiles location:
  - Legacy: `podverse-ops/pipelines/alpha/`
  - Monorepo: `podverse/pipelines/jenkins/alpha/`

## Plan Notes

- These plans focus only on Jenkins pipelines and podverse-ansible.
- No app/package code changes are required.
- Jenkins agent checkout path is assumed to be `/opt/podverse`.
- Production and sandbox paths should remain untouched.
- If sandbox overlaps with legacy or next-gen, plan steps include creating new alpha-specific files.
