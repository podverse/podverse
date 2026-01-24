# Podverse Architecture

## Module Dependency Order

| Tier | Packages |
|------|----------|
| 1 | helpers |
| 2 | external-services, orm |
| 3 | notifications, parser |
| 4 | mq |
| 5 | api, web, workers, management-* |
| 6 | qa |

## Build Order
1. helpers → 2. external-services → 3. orm → 4. notifications
→ 5. parser → 6. mq → 7. apps (parallel) → 8. qa

## Directory Structure
- `packages/` - npm packages
- `apps/` - applications
- `tools/` - dev tools
- `infra/` - docker, database
- `scripts/` - utilities
