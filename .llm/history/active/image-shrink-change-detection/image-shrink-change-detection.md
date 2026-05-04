# image-shrink-change-detection

## Started

2026-05-03

## Context

Reliable image-shrink change detection for reused origin URLs: content-versioned CDN keys, strict
HEAD/GET handling, deep re-check cadence, MQ consumer fixes for post-resize hints, and DB migration
for `last_deep_checked_at`.

### Session 1 - 2026-05-03

#### Prompt (Developer)

Image Shrink: Reliable Change Detection for Reused URLs

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `changeDetection.ts` helpers (`trustHeadUnchanged`, `bytesMatchStoredChecksum`,
  `buildShrinkImageKey`) and rewrote `batch.ts` for deep vs shallow paths, `_update`-based row
  updates, and versioned storage keys (`-c` + 16 hex of origin SHA-256).
- Extended `imageShrinkRunConsumer` to process hints when only resized rows exist, using
  `findResizedRowsByOriginImageUrl` plus `image_shrink_source` presence.
- Linear migration `0020_image_shrink_last_deep_checked_at.sql`, entity field, `ImageShrinkSourceService.shouldDeepRecheck` / `upsert` options, kustomization + API readiness env + regenerated
  `0003a`/`0003b` baselines and `0004_seed_linear_migration_history.sql`.
- Tests: `imageShrinkSource.test.ts`, `changeDetection.test.ts`; docs and env templates updated.

#### Files Created/Modified

- `apps/workers/src/commands/imageShrink/batch.ts`
- `apps/workers/src/commands/imageShrink/changeDetection.ts`
- `apps/workers/src/commands/imageShrink/changeDetection.test.ts`
- `apps/workers/src/commands/imageShrink/runConsumer.ts`
- `apps/workers/src/lib/startup/validation.ts`
- `apps/workers/.env.example`
- `apps/workers/ENV.md`
- `packages/orm/src/entities/imageShrinkSource.ts`
- `packages/orm/src/services/imageShrinkSource.ts`
- `packages/orm/src/services/imageShrinkSource.test.ts`
- `packages/orm/src/services/channel/channelImage.ts`
- `packages/orm/src/services/item/itemImage.ts`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0020_image_shrink_last_deep_checked_at.sql`
- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/workers/source/workers.env`
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql`
- `docs/image-shrinking/ARCHITECTURE/01-FLOW.md`
- `docs/image-shrinking/ARCHITECTURE/02-CACHE-RECHECK.md`
- `docs/image-shrinking/SERVICE.md`
- `.llm/history/active/image-shrink-change-detection/image-shrink-change-detection.md`
