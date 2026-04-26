# Podverse Architecture

## Module Dependency Order

| Tier | Packages                                                                                                           | Depends On                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1    | helpers, helpers-v4v                                                                                               | (none)                                                                    |
| 2    | external-services-alby, external-services-firebase, external-services-paypal, external-services-podcast-index, orm | helpers, helpers-\*                                                       |
| 3    | notifications, parser                                                                                              | helpers, external-services-firebase, external-services-podcast-index, orm |
| 4    | mq                                                                                                                 | helpers, external-services-podcast-index, orm, parser                     |
| 5    | api, web, workers, management-\*                                                                                   | various                                                                   |
| 6    | qa                                                                                                                 | helpers, external-services-\*, orm, parser                                |

## Directory Structure

- `packages/` - Publishable npm packages
- `apps/` - Deployable applications
- `tools/` - Development tools
- `infra/` - Docker, database, configs, K8s manifests

## Technologies

- Node.js 22, TypeScript (strict), npm workspaces
- Next.js 15, Express 5, PostgreSQL, TypeORM

## App Descriptions

### apps/api

REST API server built with Express 5. Handles all client requests, authentication, and data queries. Entry point: `src/index.ts`. Routes organized by resource in `src/routes/`.

### apps/web

Next.js 15 web application. Server-side rendered with App Router. Internationalized via `next-intl`. Uses session storage for back-navigation state caching.

### apps/workers

Background job processors. Handles feed parsing, notification delivery, and scheduled tasks. Connects to PostgreSQL and ActiveMQ Artemis.

### apps/management-api

Admin API for internal operations. Separate from main API for security isolation.

### apps/management-web

Admin dashboard (Next.js). Used for content moderation and system management.

## Common Code Patterns

### Service Pattern

Business logic in `*Service` classes with static methods. Located in `packages/orm/src/services/`.

### DTO Pattern

Data Transfer Objects in `packages/helpers/src/dto/`. Used for API request/response typing.

### Entity Pattern

TypeORM entities in `packages/orm/src/entities/`. Each entity maps to a database table.

### Logger Pattern

Use `@podverse/helpers` logger. Import and use: `logger.info('message', { context })`.

## Where to Find X

| Looking for...        | Location                      |
| --------------------- | ----------------------------- |
| API routes            | `apps/api/src/routes/`        |
| Database entities     | `packages/orm/src/entities/`  |
| Database services     | `packages/orm/src/services/`  |
| Shared types/DTOs     | `packages/helpers/src/dto/`   |
| Feed parsing logic    | `packages/parser/src/`        |
| Web pages             | `apps/web/src/app/`           |
| Web components        | `apps/web/src/components/`    |
| Environment templates | `infra/config/env-templates/` |
| Docker configs        | `infra/docker/`               |
| Database migrations   | `infra/database/migrations/`  |
| K8s manifests         | `infra/k8s/`                  |

## Troubleshooting Tips

### Build failures

- Run `npm run build:packages` before building apps
- Check dependency order (helpers first, then orm, etc.)

### Database connection issues

- Verify PostgreSQL is running
- Check `db.env` configuration
- Ensure database exists

### Import errors

- Packages must be built before importing
- Use workspace imports: `@podverse/helpers`, `@podverse/orm`

### Web app issues

- Clear `.next` cache if seeing stale content
- Rebuild packages if type errors persist

## Deployment

Alpha environment runs on K3s with GitOps via ArgoCD:

- **Base manifests:** `infra/k8s/base/` (shared resources for all environments)
- **Alpha overlays:** `infra/k8s/alpha/` (environment-specific config, image tags)
- **ArgoCD:** App of Apps pattern; root app syncs `alpha/apps/` which deploys all components
- **Kustomize:** Used for overlays; requires `--load-restrictor LoadRestrictionsNone`
- **Secrets:** SOPS-encrypted in repo-root `secrets/`; generators in `infra/k8s/scripts/secret-generators/`

See `infra/k8s/README.md` and `.cursor/skills/k8s/SKILL.md` for details.
