# Phase 4: Infrastructure & Tooling

**Status**: Detailed plans ready for execution

## Overview

Split podverse-ops and migrate QA to the monorepo. This phase is divided into 5 sub-parts.

## Detailed Plans

| Part | Plan File                                                    | Description                      | Effort |
| ---- | ------------------------------------------------------------ | -------------------------------- | ------ |
| A    | [04a-config-database-proxy.md](04a-config-database-proxy.md) | Config, database, proxy files    | 1-2h   |
| B    | [04b-docker-compose.md](04b-docker-compose.md)               | Docker compose with path updates | 2-3h   |
| C    | [04c-scripts.md](04c-scripts.md)                             | Utility scripts migration        | 2-4h   |
| D    | [04d-jenkins-pipelines.md](04d-jenkins-pipelines.md)         | Jenkins pipelines (server coord) | 2-3h   |
| E    | [04e-qa-migration.md](04e-qa-migration.md)                   | QA tool workspace migration      | 1-2h   |

## Execution Order

```
Part A + Part E (parallel - no dependencies)
    |
    v
Part B (depends on Part A)
    |
    v
Part C (depends on Part B)
    |
    v
Part D (depends on all, requires server coordination)
```

## Summary

### podverse-ops Breakdown

| From            | To                 |
| --------------- | ------------------ |
| config/         | infra/config/      |
| database/       | infra/database/    |
| docker-compose/ | infra/docker/      |
| proxy/          | infra/proxy/       |
| scripts/        | scripts/           |
| pipelines/      | pipelines/jenkins/ |

### podverse-qa Migration

- Move to `tools/qa/`
- Update package.json for workspace (`@podverse/qa`)
- Convert deps to workspace refs

## Estimated Effort

~8-14 hours total
