# 03 - ORM Stats Query Hardening (`PVSA-002`)

## Goal

Remove SQL-identifier interpolation risk in stats event persistence paths.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/stats/baseStatsTrackEvent.ts`
- `/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/stats/statsTrackEvent*.ts`
- ORM tests around stats track event create/delete/top aggregation

## Plan

1. Replace dynamic raw SQL string interpolation with one of:
   - TypeORM query builder using static entity metadata, or
   - strictly mapped query statements from a closed, internal enum.
2. Keep current behavior parity for:
   - create if missing
   - delete if present
   - top entities by event count
3. Preserve parameterized value bindings for all runtime values.
4. Add tests to prove:
   - each stats subtype still works.
   - no SQL string accepts dynamic identifier input.
5. Review `_deleteOldEvents` for bounded deletion approach as a follow-up hardening change.

## Verification

```bash
npm run test -w packages/orm
npm run lint -w packages/orm
```

## Done Criteria

- No dynamic table/column interpolation remains in stats service SQL paths.
- Existing stats APIs maintain behavior.
