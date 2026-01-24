# Phase 4: Infrastructure & Tooling (Outline)

**Status**: Outline - detailed plan after Phase 3

## Overview

Split podverse-ops and migrate qa.

## podverse-ops Breakdown

| From | To |
|------|-----|
| config/ | infra/config/ |
| database/ | infra/database/ |
| docker-compose/ | infra/docker/ |
| proxy/ | infra/proxy/ |
| scripts/ | scripts/ |
| pipelines/ | pipelines/jenkins/ |

## podverse-qa Migration

- Move to `tools/qa/`
- Update package.json for workspace
- Convert deps to workspace refs

## Tasks

1. Create directory structure
2. Copy/move files
3. Update paths in Docker compose
4. Update paths in scripts
5. Test local Docker setup
6. Update Jenkinsfile paths

## Estimated Effort

~8-14 hours total
