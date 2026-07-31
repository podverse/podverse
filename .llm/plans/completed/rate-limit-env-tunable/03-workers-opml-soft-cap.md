# 03 — Workers OPML soft-cap config alignment

## Goal

Keep `OPML_IMPORT_MAX_FEEDS_PER_HOUR` as the shared soft feed-cap knob, but wire workers through
the same parse helper / typed config pattern as the API so defaults and invalid handling stay
identical. Confirm K8s workers env already has the key.

## Why

API already reads this via `config.opmlImport.maxFeedsPerHour`. Workers still use a local
`resolveMaxFeedsPerHour()` in `runOpmlImport.ts`. After HTTP limits are env-driven, soft-cap
parsing should not be a one-off snowflake.

## Steps

1. Prefer parsing with the plan‑01 helper (suffix `_PER_HOUR`, default `50`) either in
   `apps/workers/src/config/index.ts` (preferred, mirrors API) or a thin wrapper used by
   `runOpmlImport.ts`.
2. Replace `resolveMaxFeedsPerHour` in
   `apps/workers/src/commands/mq/rss/runOpmlImport.ts` to use that config/helper.
3. Confirm `apps/workers/.env.example` and `infra/k8s/base/workers/source/workers.env` still
   document `OPML_IMPORT_MAX_FEEDS_PER_HOUR="50"` / `=50`. Do not add HTTP enqueue vars to
   workers (those are API-only).
4. Confirm workers startup validation already marks the soft-cap optional; keep message aligned
   with API (`Use Default (50)`).
5. No change to `processOpmlImportJob` semantics — still receives `maxFeedsPerHour` as an arg.

## Key files

- `apps/workers/src/config/index.ts` (or keep command-local if workers config is thin — prefer
  config when a typed field already fits)
- `apps/workers/src/commands/mq/rss/runOpmlImport.ts`
- `apps/workers/.env.example`
- `apps/workers/src/lib/startup/validation.ts`
- `infra/k8s/base/workers/source/workers.env`

## Out of scope

- HTTP rate limiters on workers
- local_env override wiring (plan 04)

## Operator verification

```bash
# Root
npm run build -w apps/workers
npm run test -w @podverse/mq
```
