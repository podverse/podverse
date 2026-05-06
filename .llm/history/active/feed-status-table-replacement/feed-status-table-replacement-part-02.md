# History — Feed Status Table Replacement (continued)

## Metadata

- **Started**: 2026-05-05 (continuation from part 01)
- **Author**: Cursor Agent
- **Context**: Remove legacy feed-flag bridge + transition facade; future-forward ORM/workers only.

### Session 11 - 2026-05-05

#### Prompt (Developer)

assume the code will run in a clean slate environment. we don't want any legacy handling we just want a future forward implementation. implement the plan.

#### Key Decisions

- Removed **`FeedLifecycleTransitionService`** (thin facade); callers continue to use **`feedLifecycleTransitionValidation`** directly.
- Removed **`FeedService.applyLegacyModerationFromStatusIds`**, **`LegacyFeedFlagStatusId`**, **`feedLegacyStatusToModelMapping`** (+ unit tests); **`feedLifecycleState.ts`** now exports only **`shouldAttemptFeedParseFromLifecycleAndPolicy`** (parse gate from lifecycle key + policy).
- Removed workers **`ormFeedUpdateFlagStatus`** / **`updateFlagStatus.ts`**, npm script, **`worker-commands`** registry row, **`categoriesForCommand`**, Jenkins **`Jenkinsfile.aux_workers_orm_feed_update_flag_status`**.
- Management API worker-command catalog test: dropped assertion for removed command; lowered minimum command count by one.
- Docs / SQL comments: replaced references to deleted mapping module.

#### Files Created/Modified

- `packages/orm/src/lib/feedLifecycleState.ts`
- `packages/orm/src/lib/feedLifecycleState.test.ts`
- `packages/orm/src/services/feed/feed.ts`
- `packages/orm/src/services/feed/feedPolicy.ts`
- `packages/orm/src/index.ts`
- Deleted: `packages/orm/src/lib/legacyFeedFlagStatusId.ts`, `feedLegacyStatusToModelMapping.ts`, `feedLegacyStatusToModelMapping.test.ts`, `feedLifecycleTransitionService.ts`, `feedLifecycleTransitionService.test.ts`
- `apps/workers/src/commands/index.ts`, `apps/workers/package.json`, `apps/workers/src/lib/startup/categoriesForCommand.ts`
- Deleted: `apps/workers/src/commands/orm/feed/updateFlagStatus.ts`
- `packages/worker-commands/src/registry.ts`
- `apps/management-api/src/routes/workerCommands.integration.test.ts`
- Deleted: `infra/pipelines/jenkins/alpha/Jenkinsfile.aux_workers_orm_feed_update_flag_status`
- `docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0026_feed_status_table_removal_prep.sql`
