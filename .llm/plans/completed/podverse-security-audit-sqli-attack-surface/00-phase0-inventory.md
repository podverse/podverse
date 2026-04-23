# Phase 0 - Attack Surface Inventory and Trust Boundaries

## Scope

- Repository: `/Users/mitcheldowney/repos/pv/podverse`
- Goal: inventory externally controlled inputs, query sinks, and trust boundaries before
  exploitability analysis.

## External Input Inventory

### HTTP inputs (`apps/api`)

- Route handlers read `req.params`, `req.query`, and `req.body` through helpers in
  `apps/api/src/lib/params.ts` and `apps/api/src/lib/validation/index.ts`.
- High-volume input routes:
  - `apps/api/src/controllers/account/*.ts`
  - `apps/api/src/controllers/queue/*.ts`
  - `apps/api/src/controllers/playlist/*.ts`
  - `apps/api/src/controllers/stats/statsTrackEvent*.ts`
  - `apps/api/src/controllers/mq/mq.ts`
  - `apps/api/src/controllers/metaboost/mbrssV1AppAssertion.ts`

### HTTP inputs (`apps/management-api`)

- Auth/session and params flow in:
  - `apps/management-api/src/lib/auth/index.ts`
  - `apps/management-api/src/routes/auth.ts`
  - `apps/management-api/src/routes/adminAccount.ts`

### MQ inputs (`apps/workers` + `packages/mq`)

- JSON payload ingestion from broker:
  - `apps/workers/src/commands/mq/rss/runAddByRSSParser.ts`
  - `apps/workers/src/commands/imageShrink/runConsumer.ts`
  - `packages/mq/src/functions/mq/rss/runParser.ts`
  - `packages/mq/src/functions/mq/rss/dlqHandling.ts`
- Podping websocket message ingestion:
  - `packages/mq/src/functions/mq/rss/runLiveItemListener.ts`

### Parser and outbound URL inputs

- Remote fetch entry points:
  - `packages/parser/src/lib/_request.ts`
  - `packages/parser/src/lib/rss/parser.ts`
  - `packages/parser/src/lib/rss/addByRSS.ts`
  - `packages/parser/src/lib/chapters/chapters.ts`
- Shared HTTP client:
  - `packages/helpers-requests/src/_request.ts`

## Query Sink Inventory

### Raw SQL

- `packages/orm/src/services/stats/baseStatsTrackEvent.ts`
  - `EntityManager.query(...)` with interpolated table/column identifiers and parameterized values.
- `packages/orm/src/services/imageShrinkSource.ts`
  - `Repository.query(...)` with static SQL and parameterized value.
- `tools/web-perf/lighthouse/src/user-manager.ts`
  - Tooling-only DB raw queries (outside runtime app paths).

### Query builder and repository sinks

- Query builder concentration in:
  - `packages/orm/src/services/item/item.ts`
  - `packages/orm/src/services/playlist/playlistResource.ts`
  - `packages/orm/src/services/queue/queueResource.ts`
  - `packages/orm/src/services/onDemandParserEvent.ts`
  - `packages/orm/src/services/clip.ts`
  - `packages/orm/src/services/item/itemSoundbite.ts`
- Shared base sinks:
  - `packages/orm/src/services/base/baseManyService.ts`
  - `packages/orm/src/services/base/baseOneService.ts`
  - `packages/orm/src/services/base/baseGetOnlyService.ts`

## Trust Boundary Map

1. Public internet -> `apps/api` via ingress and Express middleware.
2. Browser (`apps/web`) -> API via cookie/bearer authenticated request helpers.
3. Browser (`apps/management-web`) -> management API via credentialed axios calls.
4. API/workers -> MQ broker (`packages/mq` ActiveMQ Artemis layer).
5. Parser/workers -> external network (RSS feeds, chapter URLs, podcast index APIs).
6. App services -> Postgres via TypeORM datasource factories.
7. Runtime config sidecars -> browser global runtime config injection.

## Initial Risk Hypotheses To Validate In Later Phases

- SQLi: dynamic SQL identifier interpolation in stats raw SQL paths.
- IDOR/authz: entity-by-id routes that rely on authentication but not ownership checks.
- SSRF/DoS: parser outbound fetch paths with broad URL acceptance and limited response guards.
- CSRF/session misuse: credentialed web requests and cookie session handling across apps.
- Validation hygiene: schema strictness and unknown field handling.
