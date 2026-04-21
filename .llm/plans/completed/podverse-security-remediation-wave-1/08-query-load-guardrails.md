# 08 - Query Load Guardrails (P2 Follow-up)

## Goal

Reduce query amplification risks in heavy list/history paths.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/queue/queueResource.ts`
- route/controller call sites that pass list options into this service

## Plan

1. Add explicit caps for list option inputs (`take`, optional cursor/page windows).
2. Bound or validate large array/collection inputs used in `IN` conditions.
3. Add service-level defaults for history queries when options are omitted.
4. Add tests proving guardrails:
   - excessive limits are clamped or rejected.
   - normal limits still return expected results.

## Verification

```bash
npm run test -w packages/orm
npm run lint -w packages/orm
```

## Done Criteria

- Query-heavy service paths are bounded by policy-driven limits.
