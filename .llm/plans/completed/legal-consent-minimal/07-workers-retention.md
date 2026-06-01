# Phase 7 — Workers stats retention env

## Goal

Replace hardcoded 30-day (`TIME_CONSTANTS.ONE_MONTH_IN_MINUTES`) stats
event deletion with configurable `STATS_TRACK_EVENT_RETENTION_DAYS`.

## Files

- `apps/workers/src/config/index.ts` — read env, expose number
- `apps/workers/src/lib/startup/validation.ts` — positive integer, e.g. 1–3650
- `apps/workers/src/commands/stats/statsUpdateAggregated.ts`:

```typescript
const retentionMinutes =
  config.stats.trackEventRetentionDays * 24 * 60;
await deleteOldEvents(retentionMinutes);
```

Remove dependency on `TIME_CONSTANTS.ONE_MONTH_IN_MINUTES` in this file.

## Env

- `apps/workers/.env.example` — document default `30`
- `infra/k8s/base/workers/source/workers.env`
- GitOps workers env if separate

Ensure phase 1 already synced `NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS`
for terms display consistency.

## Tests

Optional unit test: config parses retention days. No worker integration
test required if env validation covers it.

## Exit criteria

- Worker command uses env-driven retention
- Default 30 days preserves current behavior
- Terms page `{retention_days}` matches worker config when env synced

## Verification

```bash
./scripts/nix/with-env npm run lint -w apps/workers
./scripts/nix/with-env npm run build -w apps/workers
```
