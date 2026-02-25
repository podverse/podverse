# Feature: image-shrinking-service (Part 2)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 21, create `image-shrinking-service-part-03.md`.

## Metadata

- Started: 2026-02-15
- Completed: 2026-02-18
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/45
- Branch: feature/image-shrinking-service
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 11 - 2026-02-15

#### Prompt (Developer)

Parser hint storage not concretized

i don't think the queue should be "short-lived" itself.

recommend TTL / storage semantics

make cron job file naming consistent

#### Key Decisions

- Defined MQ hints as durable with consumer-side freshness cutoff (24 hours).
- Standardized cronjob manifest naming to `worker-image-shrinking.cronjob.yaml`.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 12 - 2026-02-15

#### Prompt (Developer)

split history file and rate and revie

#### Key Decisions

- Split history into `image-shrinking-service-part-02.md` after Session 10.
- Moved Session 11 into the new part file.

#### Files Modified

- .llm/history/active/image-shrinking-service/image-shrinking-service-part-01.md
- .llm/history/active/image-shrinking-service/image-shrinking-service-part-02.md

### Session 13 - 2026-02-15

#### Prompt (Developer)

implement the plans

#### Key Decisions

- Implemented image shrinking as an hourly batch worker with MQ hints and DigitalOcean Spaces.
- Preserved `is_resized` rows when updating parsed images to avoid deleting resized entries.
- Added list-only image selection helpers that prefer resized images when available.

#### Files Modified

- apps/web/src/components/List/Clips/ListClipRow.tsx
- apps/web/src/components/List/ItemChapters/ListItemChapterRow.tsx
- apps/web/src/components/List/ItemSoundbites/ListItemSoundbiteRow.tsx
- apps/web/src/components/List/LiveItem/ListLiveItemGridNode.tsx
- apps/web/src/components/List/LiveItem/ListLiveItemRow.tsx
- apps/web/src/components/List/Music/Albums/ListAlbumGridNode.tsx
- apps/web/src/components/List/Music/Albums/ListAlbumRow.tsx
- apps/web/src/components/List/Music/Albums/Tracks/ListTrackGridNode.tsx
- apps/web/src/components/List/Music/Albums/Tracks/ListTrackRow.tsx
- apps/web/src/components/List/Music/Artists/ListArtistGridNode.tsx
- apps/web/src/components/List/Music/Artists/ListArtistRow.tsx
- apps/web/src/components/List/Podcasts/Episodes/ListEpisodeGridNode.tsx
- apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx
- apps/workers/.env.example
- apps/workers/APPS-WORKERS.md
- apps/workers/ENV.md
- apps/workers/package.json
- apps/workers/src/commands/commandNames.ts
- apps/workers/src/commands/imageShrink/batch.ts
- apps/workers/src/commands/index.ts
- apps/workers/src/commands/parser/rss/parseFeed.ts
- apps/workers/src/config/index.ts
- apps/workers/src/factories/digitalOceanService.ts
- apps/workers/src/index.ts
- apps/workers/src/lib/startup/categoriesForCommand.ts
- apps/workers/src/lib/startup/validation.ts
- docs/IMAGE-SHRINKING-SERVICE.md
- infra/config/env-templates/workers.env.example
- infra/k8s/base/cron/kustomization.yaml
- infra/k8s/base/cron/worker-image-shrinking.cronjob.yaml
- infra/k8s/base/workers/configmap.yaml
- infra/k8s/base/workers/consumer-dlq.deployment.yaml
- infra/k8s/base/workers/listener-live.deployment.yaml
- infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml
- infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml
- infra/k8s/base/workers/parser-live.deployment.yaml
- infra/k8s/base/workers/parser-normal.deployment.yaml
- infra/k8s/base/workers/parser-ondemand.deployment.yaml
- infra/k8s/scripts/create_workers_digital_ocean_secret.sh
- package.json
- packages/external-services-digital-ocean/package.json
- packages/external-services-digital-ocean/src/index.ts
- packages/external-services-digital-ocean/tsconfig.json
- packages/helpers/src/index.ts
- packages/helpers/src/lib/image.ts
- packages/helpers/src/lib/imageShrink.ts
- packages/helpers/src/lib/mq/dedupeWindows.ts
- packages/helpers/src/lib/mq/mqConstants.ts
- packages/mq/src/functions/mq/rss/addImageHint.ts
- packages/mq/src/functions/mq/rss/runParser.ts
- packages/mq/src/index.ts
- packages/mq/src/services/activeMQArtemis/index.ts
- packages/mq/src/types/mq.ts
- packages/orm/src/services/channel/channelImage.ts
- packages/orm/src/services/item/itemImage.ts
- packages/parser/src/lib/rss/parser.ts

### Session 14 - 2026-02-15

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/10.txt debug

#### Key Decisions

- Tightened type guards and return shapes to satisfy build errors.
- Simplified image service updateMany matching to avoid unsafe indexed access.

#### Files Modified

- apps/workers/src/commands/imageShrink/batch.ts
- packages/helpers/src/lib/image.ts
- packages/mq/src/functions/mq/rss/runParser.ts
- packages/orm/src/services/channel/channelImage.ts
- packages/orm/src/services/item/itemImage.ts
- packages/parser/src/index.ts
- packages/parser/src/lib/rss/parser.ts

### Session 15 - 2026-02-15

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/10.txt:562-908 debug further

#### Key Decisions

- Avoided relying on parser type exports in mq by narrowing hint fields locally.

#### Files Modified

- packages/mq/src/functions/mq/rss/runParser.ts

### Session 16 - 2026-02-15

#### Prompt (Developer)

the startup validation should account for the shrunk image service

also, image shrinking should be an optional feature. if any of the required env vars are missing for the image shrinking implementation, the image shrinking functionality should be disabled and the validation logger should indicate that it is disabled

#### Key Decisions

- Image shrink validation logs disabled when all env vars are missing, but fails startup when any are partially set.
- Runtime only initializes DigitalOcean and runs the batch job when image shrink is enabled.

#### Files Modified

- apps/workers/src/commands/imageShrink/batch.ts
- apps/workers/src/config/index.ts
- apps/workers/src/index.ts
- apps/workers/src/lib/startup/validation.ts

### Session 17 - 2026-02-15

#### Prompt (Developer)

save the plan file/s locally

#### Key Decisions

- Moved the change-detection plan into .llm/plans/active/image-shrinking-service.

#### Files Modified

- .llm/plans/active/image-shrinking-service/03-change-detection.md
- .cursor/plans/image_shrink_change_detection_f2030a3e.plan.md

### Session 18 - 2026-02-15

#### Prompt (Developer)

implement the change detection plan. update documentation or env var handling if needed

#### Key Decisions

- Added per-URL origin metadata storage to track image changes efficiently.
- Updated shrink batch to use conditional requests and recheck throttling.

#### Files Modified

- apps/workers/src/commands/imageShrink/batch.ts
- apps/workers/.env.example
- apps/workers/ENV.md
- docs/IMAGE-SHRINKING-SERVICE.md
- infra/config/env-templates/workers.env.example
- infra/k8s/base/workers/configmap.yaml
- packages/orm/src/entities/imageShrinkSource.ts
- packages/orm/src/index.ts
- packages/orm/src/services/imageShrinkSource.ts

### Session 19 - 2026-02-15

#### Prompt (Developer)

implement the remaining plan files

#### Key Decisions

- Added SQL migration for image_shrink_source under infra/database/migrations.
- Implemented source pruning when no resized rows remain, plus optional age-based cleanup.

#### Files Modified

- apps/workers/src/commands/imageShrink/batch.ts
- apps/workers/.env.example
- apps/workers/ENV.md
- docs/IMAGE-SHRINKING-SERVICE.md
- infra/config/env-templates/workers.env.example
- infra/database/migrations/0014_image_shrink_source.sql
- infra/k8s/base/workers/configmap.yaml
- packages/orm/src/services/imageShrinkSource.ts

### Session 20 - 2026-02-15

#### Prompt (Developer)

if the plans are completed, move them to completed

#### Key Decisions

- Moved completed image shrinking plan files into .llm/plans/completed.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/00-architecture.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md
- .llm/plans/active/image-shrinking-service/03-change-detection.md
- .llm/plans/completed/image-shrinking-service/00-master-plan.md
- .llm/plans/completed/image-shrinking-service/00-architecture.md
- .llm/plans/completed/image-shrinking-service/01-do-package.md
- .llm/plans/completed/image-shrinking-service/02-worker-and-db.md
- .llm/plans/completed/image-shrinking-service/03-change-detection.md

---

## Related Resources

- [Link to PR]
- [Link to related issues]
