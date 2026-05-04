# per-feed-spam-limit-override

## Started

2026-05-03

## Context

Add customizable per-feed spam limits with parser precedence and full management API and management-web support.

### Session 1 - 2026-05-03

#### Prompt (Developer)

Per-feed spam limits in Podverse

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added app migration `0019_feed_spam_item_limit_override.sql` to store per-feed overrides as nullable positive integers.
- Implemented parser precedence as: feed override wins; otherwise existing status-based global thresholds apply.
- Extended management-api feed operations lookup/apply payloads to read/write `spam_item_limit_override`.
- Added management-web Feed Operations form support to set and clear spam override values.
- Added coverage in ORM unit tests, management-api integration tests, and a management-web E2E spec with mocked feed-operations endpoints.
- Regenerated linear baseline snapshots via `make db_regen_linear_baseline` after adding the app linear migration.

#### Files Modified

- `.llm/history/active/per-feed-spam-limit-override/per-feed-spam-limit-override-part-01.md`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0019_feed_spam_item_limit_override.sql`
- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`
- `packages/orm/src/entities/feed/feed.ts`
- `packages/orm/src/services/feed/feedFlagStatus.ts`
- `packages/orm/src/services/feed/feedFlagStatus.test.ts`
- `packages/parser/src/lib/rss/parser.ts`
- `apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts`
- `apps/management-api/src/routes/feedFlagStatus.ts`
- `apps/management-api/src/lib/database/tablePolicy.ts`
- `apps/management-api/src/routes/feedFlagStatus.integration.test.ts`
- `apps/management-web/src/lib/requests/feedFlagStatus.ts`
- `apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx`
- `apps/management-web/e2e/feed-operations-flag-status.spec.ts`

### Session 2 - 2026-05-03

#### Prompt (Developer)

Spam Check: Include Remote Items

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Extended `checkIfSpamFeed` with `parsedFeed?.podcastRemoteItems?.length >= spamLimit` alongside items and live items; same `spamLimit` and per-feed override semantics as before.

#### Files Modified

- `packages/orm/src/services/feed/feedFlagStatus.ts`
- `packages/orm/src/services/feed/feedFlagStatus.test.ts`
- `.llm/history/active/per-feed-spam-limit-override/per-feed-spam-limit-override-part-01.md`
