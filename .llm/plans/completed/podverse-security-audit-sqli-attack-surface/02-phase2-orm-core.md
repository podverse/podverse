# Phase 2 - ORM Query Sink Audit (SQLi Core)

## Scope Reviewed

- `packages/orm/src/services/stats/baseStatsTrackEvent.ts`
- `packages/orm/src/services/stats/statsTrackEvent*.ts`
- `packages/orm/src/services/item/item.ts`
- `packages/orm/src/services/queue/queueResource.ts`
- `packages/orm/src/services/base/baseManyService.ts`
- `packages/orm/src/services/imageShrinkSource.ts`
- `packages/orm/src/services/onDemandParserEvent.ts`

## SQL Injection Findings

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Low (current exploitability), Medium (future footgun) | High | Raw SQL statements interpolate SQL identifiers (table/column names) in stats base service. | `baseStatsTrackEvent.ts` uses ``${this.entityName}`` and ``${this.entityIdField}`` in `SELECT`/`INSERT`/`DELETE`. |
| None observed (direct SQLi) | High | Runtime values are parameterized where raw SQL exists. | Same file uses `$1`, `$2`, `$3`; `imageShrinkSource.ts` parameterizes prune interval input. |
| None observed (direct SQLi) | High | QueryBuilder and repository methods use bind parameters and typed criteria. | `item.ts`, `queueResource.ts`, `onDemandParserEvent.ts`, base services. |

## SQLi Adjacent Query Risks

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Medium | High | Unbounded deletion strategy can load large old-event datasets into memory. | `_deleteOldEvents` in `baseStatsTrackEvent.ts` calls `find(...)` then `remove(oldEvents)`. |
| Medium | Medium | `FindManyOptions` passthrough can widen reads if callers do not constrain options. | `queueResource.ts` `getHistoryResourcesByQueueIdText(..., options)` spreads `...options`. |
| Medium | Medium | Generic base service methods merge arbitrary where key-values from callers. | `baseManyService.ts` `_get`, `_delete` merge `whereKeyValues` into TypeORM criteria. |
| Low-Medium | Medium | Potential query weight from large `IN` collections. | `queueResource.ts` uses `IN (:...queueIds)` with account queue sets. |

## Explicitly Verified Safe Patterns

- `statsTrackEventItem.ts` and sibling subclasses define fixed constants for `entityName` and
  `entityIdField`; these are not sourced from request input at runtime.
- `item.ts` shuffle ordering uses a bound parameter:
  - `addSelect('MD5(item.id::text || (:shuffleHash)::text)', ...)`
  - `.setParameter('shuffleHash', String(shuffleHash))`
- `imageShrinkSource.ts` uses a static SQL string with parameterized pruning value.

## Phase 2 Conclusion

- No confirmed exploitable SQL injection was identified in ORM services reviewed.
- The highest SQL-adjacent hardening target is replacing identifier interpolation with safer
  static query builder or whitelisted map-based SQL generation.
