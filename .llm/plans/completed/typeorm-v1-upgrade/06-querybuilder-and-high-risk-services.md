# Plan 06 — QueryBuilder and high-risk services

## Objective

Fix **string entity name** lookups, audit QueryBuilder-heavy services, and address v1 **behavioral changes** (`invalidWhereValuesBehavior`, `nullable: false` INNER JOINs).

## Scope

| Area | Files |
| ---- | ----- |
| String entity `findOne('Queue'` | `packages/orm/src/services/queue/queueResource.ts` |
| QueryBuilder services | 17 files (see list) |
| Entity nullable audit | `channel.ts`, `liveItem.ts` entities |
| Dynamic where builders | Services passing optional filters into `where` |

## Part A — queueResource.ts (highest risk)

### Replace string entity names

TypeORM v1 requires entity class references, not string names:

```typescript
// Before
const queue = await manager.findOne('Queue', { where: { id_text: queue_id_text } });

// After
import { Queue } from '@orm/entities/queue/queue.js';
const queue = await manager.findOne(Queue, { where: { id_text: queue_id_text } });
```

**5 call sites** in `queueResource.ts` use `'Queue'`. Convert all; remove `as any` on queue results where typing allows.

Keep `QueueResource` entity class usages as-is (already correct).

### Reduce `as any`

Concentrated in list-position logic (`Between`, `LessThan`, dynamic keys). Prefer:

- Properly typed `FindOptionsWhere<QueueResource>`
- Narrowing helpers for dynamic order keys
- QueryBuilder with explicit aliases where find options are too dynamic

Do not leave `as any` unless documented as a rare escape hatch per repo rules.

## Part B — QueryBuilder file review

Review and fix v1 compile/runtime issues in:

| File | Notes |
| ---- | ----- |
| `packages/orm/src/services/item/item.ts` | Largest QB surface (~19 refs) |
| `packages/orm/src/services/queue/queueResource.ts` | QB + transactions |
| `packages/orm/src/services/playlist/playlistResource.ts` | Ordering QB |
| `packages/orm/src/services/archiver.ts` | Batch archival |
| `packages/orm/src/services/deduplicator.ts` | Dedup queries |
| `packages/orm/src/services/stats/baseStatsTrackEvent.ts` | Stats inserts |
| `packages/orm/src/services/stats/statsTrackAccountGuid.ts` | GUID tracking |
| `packages/orm/src/services/feed/feed.ts` | Feed lookups |
| `packages/orm/src/services/clip.ts` | Clip queries |
| `packages/orm/src/services/onDemandParserEvent.ts` | Parser events |
| `packages/orm/src/services/account/accountFCMDevice.ts` | Device QB |
| `packages/orm/src/services/account/accountUPDevice.ts` | Device QB |
| `packages/orm/src/services/account/accountWebPushDevice.ts` | Device QB |
| `packages/orm/src/services/item/itemSoundbite.ts` | Soundbite QB |
| `apps/management-api/src/orm/services/adminAccount.ts` | Admin list QB |
| `tools/test-assets/src/populate-database.ts` | Seed QB |
| `packages/orm/src/services/stats/baseStatsTrackEvent.create.test.ts` | Test mocks |
| `packages/orm/src/services/stats/statsTrackAccountGuid.test.ts` | Test mocks |
| `packages/orm/src/services/archiver.test.ts` | Test mocks |

Check for removed APIs: `printSql`, `onConflict`, `replacePropertyNames`, `orUpdate` object overload (baseline: **none used**).

## Part C — invalidWhereValuesBehavior

v1 default: **`throw`** on `null` / `undefined` in find/mutation `where` objects.

### Audit pattern

Search for optional filter construction:

```bash
rg "where:.*undefined|where:.*\?\." packages/orm apps/api --glob '*.ts'
```

### Fix patterns

```typescript
// BAD — undefined silently skipped in 0.3, throws in 1.0
await repo.find({ where: { name: optionalName } });

// GOOD — omit key when absent
await repo.find({
  where: {
    ...(optionalName !== undefined ? { name: optionalName } : {}),
  },
});

// GOOD — explicit null match
import { IsNull } from 'typeorm';
await repo.find({ where: { deleted_at: IsNull() } });
```

Do **not** set `invalidWhereValuesBehavior: { null: 'ignore', undefined: 'ignore' }` on DataSource.

## Part D — nullable: false INNER JOIN behavior

Relations with `@ManyToOne(..., { nullable: false })` now use **INNER JOIN** when loaded via `relations`.

Review entities:

- `packages/orm/src/entities/channel/channel.ts`
- `packages/orm/src/entities/liveItem/liveItem.ts`

If dev/test DBs have orphaned FKs, relation loads may exclude parent rows. Options:

1. Fix test seed data integrity (preferred).
2. Change relation to `nullable: true` only if product semantics allow optional relation.

Do not add runtime fallbacks — fix data or entity metadata intentionally.

## Steps

1. Fix all `'Queue'` string entity lookups in `queueResource.ts`.
2. Build `@podverse/orm`; fix QB compile errors file by file.
3. Audit dynamic `where` builders in queue, item, playlist, account list services.
4. Review nullable:false entities; run API integration tests touching channel/liveItem paths.
5. Run ORM unit tests and targeted API tests.

## Key files

| Path | Risk |
| ---- | ---- |
| `packages/orm/src/services/queue/queueResource.ts` | Critical |
| `packages/orm/src/services/item/item.ts` | High |
| `packages/orm/src/services/playlist/playlistResource.ts` | Medium |
| `packages/orm/src/entities/queue/queue.ts` | Entity import for findOne |

## Deliverables

- [x] Zero `findOne('EntityString'` in packages/orm
- [x] QueryBuilder files compile under v1 (`npm run build -w @podverse/orm`)
- [x] No `invalidWhereValuesBehavior` rollback in factory
- [x] Dynamic where audit complete; queue helpers use typed `FindOptionsWhere` / FK columns only
- [x] nullable:false entities reviewed (channel/liveItem — no schema change; fix seeds if INNER JOIN excludes rows)

## Verification

```bash
rg "findOne\('" packages/orm --glob '*.ts'
./scripts/nix/with-env npm run build -w @podverse/orm
./scripts/nix/with-env npm run test -w @podverse/orm
make test_deps
./scripts/nix/with-env npm run test:e2e:api -- --testPathPattern='queue|playlist|channel|liveItem' 2>/dev/null || \
  ./scripts/nix/with-env npm run test:e2e:api
```

## Completion checklist

- [x] queueResource string entity names eliminated
- [x] ORM package builds
- [ ] ORM unit tests pass (run locally; may need `@rollup/rollup-darwin-arm64` on Mac)
- [x] No DataSource invalidWhereValuesBehavior rollback added
