# Podverse Architecture

## Module Dependency Order

| Tier | Packages | Depends On |
|------|----------|------------|
| 1 | helpers | (none) |
| 2 | external-services, orm | helpers |
| 3 | notifications, parser | helpers, external-services, orm |
| 4 | mq | helpers, external-services, orm, parser |
| 5 | api, web, workers, management-* | various |
| 6 | qa | helpers, external-services, orm, parser |

## Directory Structure
- `packages/` - Publishable npm packages
- `apps/` - Deployable applications
- `tools/` - Development tools
- `infra/` - Docker, database, configs

## Technologies
- Node.js 22, TypeScript (strict), npm workspaces
- Next.js 15, Express 5, PostgreSQL, TypeORM
